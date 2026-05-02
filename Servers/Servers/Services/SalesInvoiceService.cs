using System.Net.Mail;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Servers.Configuration;
using Servers.Data;
using Servers.DTOs.SalesInvoices;
using Servers.Models;

namespace Servers.Services;

public interface ISalesInvoiceService
{
    Task<IReadOnlyCollection<SalesInvoiceResponse>> GetInvoicesAsync(string? query, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<SalesInvoiceResponse>> GetCustomerInvoicesAsync(int customerId, CancellationToken cancellationToken);

    Task<SalesInvoiceResponse?> GetInvoiceAsync(int salesInvoiceId, int? requiredCustomerId, CancellationToken cancellationToken);

    Task<SalesInvoiceResponse> CreateInvoiceAsync(CreateSalesInvoiceRequest request, int staffId, CancellationToken cancellationToken);

    Task<SalesInvoiceResponse> CreateFromPartRequestAsync(
        int partRequestId,
        CreateSalesInvoiceFromPartRequestRequest request,
        int staffId,
        CancellationToken cancellationToken);
}

public sealed class SalesInvoiceValidationException : Exception
{
    public SalesInvoiceValidationException(string message)
        : base(message)
    {
    }
}

public sealed class SalesInvoiceService : ISalesInvoiceService
{
    private const decimal LoyaltyThreshold = 5000m;
    private const decimal LoyaltyDiscountRate = 0.10m;

    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly INotificationService _notifications;
    private readonly BrevoEmailOptions _emailOptions;
    private readonly ILogger<SalesInvoiceService> _logger;

    public SalesInvoiceService(
        AppDbContext db,
        IEmailService emailService,
        INotificationService notifications,
        IOptions<BrevoEmailOptions> emailOptions,
        ILogger<SalesInvoiceService> logger)
    {
        _db = db;
        _emailService = emailService;
        _notifications = notifications;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<SalesInvoiceResponse>> GetInvoicesAsync(
        string? query,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var invoicesQuery = QueryInvoices().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            invoicesQuery = invoicesQuery.Where(invoice =>
                invoice.InvoiceNumber.ToLower().Contains(normalizedQuery)
                || invoice.Customer.FullName.ToLower().Contains(normalizedQuery)
                || invoice.Customer.Email.ToLower().Contains(normalizedQuery)
                || invoice.Customer.Phone.ToLower().Contains(normalizedQuery)
                || invoice.Staff.FullName.ToLower().Contains(normalizedQuery)
                || invoice.Items.Any(item =>
                    item.PartName.ToLower().Contains(normalizedQuery)
                    || item.PartNumber.ToLower().Contains(normalizedQuery)));
        }

        var invoices = await invoicesQuery
            .OrderByDescending(invoice => invoice.InvoiceDate)
            .ThenByDescending(invoice => invoice.SalesInvoiceId)
            .Take(100)
            .ToArrayAsync(cancellationToken);

        return invoices.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<SalesInvoiceResponse>> GetCustomerInvoicesAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var invoices = await QueryInvoices()
            .AsNoTracking()
            .Where(invoice => invoice.CustomerId == customerId)
            .OrderByDescending(invoice => invoice.InvoiceDate)
            .ThenByDescending(invoice => invoice.SalesInvoiceId)
            .ToArrayAsync(cancellationToken);

        return invoices.Select(ToResponse).ToArray();
    }

    public async Task<SalesInvoiceResponse?> GetInvoiceAsync(
        int salesInvoiceId,
        int? requiredCustomerId,
        CancellationToken cancellationToken)
    {
        var invoice = await QueryInvoices()
            .AsNoTracking()
            .FirstOrDefaultAsync(current =>
                current.SalesInvoiceId == salesInvoiceId
                && (!requiredCustomerId.HasValue || current.CustomerId == requiredCustomerId.Value),
                cancellationToken);

        return invoice is null ? null : ToResponse(invoice);
    }

    public async Task<SalesInvoiceResponse> CreateInvoiceAsync(
        CreateSalesInvoiceRequest request,
        int staffId,
        CancellationToken cancellationToken)
    {
        await EnsureCustomerExistsAsync(request.CustomerId, cancellationToken);
        PartRequest? sourceRequest = null;

        if (request.SourcePartRequestId.HasValue)
        {
            sourceRequest = await ValidateSourceRequestAsync(
                request.SourcePartRequestId.Value,
                request.CustomerId,
                cancellationToken);
        }

        var invoice = await BuildAndSaveInvoiceAsync(
            request.CustomerId,
            staffId,
            request.SourcePartRequestId,
            request.InvoiceDate,
            request.PaidAmount,
            request.PaymentMethod,
            request.DueDate,
            request.Notes,
            request.Items,
            sourceRequest,
            cancellationToken);

        return invoice;
    }

    public async Task<SalesInvoiceResponse> CreateFromPartRequestAsync(
        int partRequestId,
        CreateSalesInvoiceFromPartRequestRequest request,
        int staffId,
        CancellationToken cancellationToken)
    {
        var partRequest = await _db.PartRequests
            .Include(current => current.Customer)
            .FirstOrDefaultAsync(current => current.PartRequestId == partRequestId, cancellationToken);

        if (partRequest is null)
        {
            throw new SalesInvoiceValidationException("Part request was not found.");
        }

        if (partRequest.Status != PartRequestStatus.Available)
        {
            throw new SalesInvoiceValidationException("Only available part requests can be invoiced.");
        }

        return await BuildAndSaveInvoiceAsync(
            partRequest.CustomerId,
            staffId,
            partRequest.PartRequestId,
            DateTime.UtcNow,
            request.PaidAmount,
            request.PaymentMethod,
            request.DueDate,
            request.Notes,
            request.Items,
            partRequest,
            cancellationToken);
    }

    private async Task<SalesInvoiceResponse> BuildAndSaveInvoiceAsync(
        int customerId,
        int staffId,
        int? sourcePartRequestId,
        DateTime invoiceDate,
        decimal paidAmount,
        SalesInvoicePaymentMethod paymentMethod,
        DateTime? dueDate,
        string notes,
        IReadOnlyCollection<SalesInvoiceItemRequest> items,
        PartRequest? sourceRequest,
        CancellationToken cancellationToken)
    {
        var parts = await GetValidatedPartsAsync(items, cancellationToken);
        ValidateStock(items, parts);

        var invoice = new SalesInvoice
        {
            InvoiceNumber = await GenerateInvoiceNumberAsync(cancellationToken),
            CustomerId = customerId,
            StaffId = staffId,
            SourcePartRequestId = sourcePartRequestId,
            InvoiceDate = ToUtcDateTime(invoiceDate),
            PaymentMethod = paymentMethod,
            PaidAmount = paidAmount,
            DueDate = ToUtcNullableDateTime(dueDate),
            Notes = notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        ApplyItemsAndTotals(invoice, items, parts);
        ApplyPayment(invoice);
        ApplyStockDelta(invoice.Items, parts);

        if (sourceRequest is not null)
        {
            sourceRequest.Status = PartRequestStatus.Invoiced;
            sourceRequest.ResolvedAt = DateTime.UtcNow;
            sourceRequest.UpdatedAt = DateTime.UtcNow;
        }

        _db.SalesInvoices.Add(invoice);
        await _db.SaveChangesAsync(cancellationToken);

        var savedInvoice = await GetInvoiceWithDetailsAsync(invoice.SalesInvoiceId, cancellationToken) ?? invoice;
        savedInvoice.EmailSent = await TrySendInvoiceEmailAsync(savedInvoice, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForUserAsync(
            savedInvoice.CustomerId,
            "SalesInvoiceCreated",
            "Sales invoice ready",
            $"Invoice {savedInvoice.InvoiceNumber} is ready for your review.",
            "/customer/history",
            nameof(SalesInvoice),
            savedInvoice.SalesInvoiceId,
            cancellationToken);

        return ToResponse(savedInvoice);
    }

    private IQueryable<SalesInvoice> QueryInvoices()
    {
        return _db.SalesInvoices
            .Include(invoice => invoice.Customer)
            .Include(invoice => invoice.Staff)
            .Include(invoice => invoice.SourcePartRequest)
            .Include(invoice => invoice.Items)
                .ThenInclude(item => item.Part);
    }

    private Task<SalesInvoice?> GetInvoiceWithDetailsAsync(
        int salesInvoiceId,
        CancellationToken cancellationToken)
    {
        return QueryInvoices()
            .FirstOrDefaultAsync(invoice => invoice.SalesInvoiceId == salesInvoiceId, cancellationToken);
    }

    private async Task EnsureCustomerExistsAsync(int customerId, CancellationToken cancellationToken)
    {
        var exists = await _db.Users.AnyAsync(
            user => user.Id == customerId && user.Role == UserRole.Customer,
            cancellationToken);

        if (!exists)
        {
            throw new SalesInvoiceValidationException("Selected customer was not found.");
        }
    }

    private async Task<PartRequest> ValidateSourceRequestAsync(
        int partRequestId,
        int customerId,
        CancellationToken cancellationToken)
    {
        var partRequest = await _db.PartRequests.FirstOrDefaultAsync(
            current => current.PartRequestId == partRequestId && current.CustomerId == customerId,
            cancellationToken);

        if (partRequest is null)
        {
            throw new SalesInvoiceValidationException("Source part request was not found.");
        }

        if (partRequest.Status != PartRequestStatus.Available)
        {
            throw new SalesInvoiceValidationException("Only available part requests can be invoiced.");
        }

        return partRequest;
    }

    private async Task<Dictionary<int, Part>> GetValidatedPartsAsync(
        IReadOnlyCollection<SalesInvoiceItemRequest> items,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            throw new SalesInvoiceValidationException("Add at least one invoice item.");
        }

        var duplicatePartId = items
            .Where(item => item.PartId.HasValue)
            .GroupBy(item => item.PartId)
            .FirstOrDefault(group => group.Count() > 1)
            ?.Key;

        if (duplicatePartId.HasValue)
        {
            throw new SalesInvoiceValidationException("Each part can appear only once in a sales invoice.");
        }

        foreach (var item in items.Where(item => !item.PartId.HasValue))
        {
            if (string.IsNullOrWhiteSpace(item.PartName))
            {
                throw new SalesInvoiceValidationException("Custom invoice items need a part name.");
            }

            if (item.UnitPrice <= 0)
            {
                throw new SalesInvoiceValidationException($"Enter a selling price for {item.PartName.Trim()}.");
            }
        }

        var partIds = items
            .Where(item => item.PartId.HasValue)
            .Select(item => item.PartId!.Value)
            .Distinct()
            .ToArray();
        var parts = await _db.Parts
            .Where(part => partIds.Contains(part.PartId) && part.IsActive)
            .ToDictionaryAsync(part => part.PartId, cancellationToken);

        var missingPartId = items
            .Where(item => item.PartId.HasValue)
            .Select(item => item.PartId!.Value)
            .FirstOrDefault(partId => !parts.ContainsKey(partId));
        if (missingPartId != 0)
        {
            throw new SalesInvoiceValidationException($"Part #{missingPartId} was not found.");
        }

        return parts;
    }

    private static void ValidateStock(
        IReadOnlyCollection<SalesInvoiceItemRequest> items,
        IReadOnlyDictionary<int, Part> parts)
    {
        foreach (var item in items)
        {
            if (!item.PartId.HasValue)
            {
                continue;
            }

            var part = parts[item.PartId.Value];
            if (part.QuantityInStock < item.Quantity)
            {
                throw new SalesInvoiceValidationException(
                    $"{part.Name} has only {part.QuantityInStock} unit(s) in stock.");
            }
        }
    }

    private static void ApplyItemsAndTotals(
        SalesInvoice invoice,
        IReadOnlyCollection<SalesInvoiceItemRequest> items,
        IReadOnlyDictionary<int, Part> parts)
    {
        invoice.Items = items.Select(item =>
        {
            var part = item.PartId.HasValue ? parts[item.PartId.Value] : null;
            var partName = !string.IsNullOrWhiteSpace(item.PartName)
                ? item.PartName.Trim()
                : part?.Name ?? string.Empty;
            var partNumber = !string.IsNullOrWhiteSpace(item.PartNumber)
                ? item.PartNumber.Trim().ToUpperInvariant()
                : part?.PartNumber ?? string.Empty;
            var unitPrice = item.UnitPrice > 0 ? item.UnitPrice : part?.SellingPrice ?? 0m;

            if (string.IsNullOrWhiteSpace(partName))
            {
                throw new SalesInvoiceValidationException("Every invoice item needs a part name.");
            }

            if (unitPrice <= 0)
            {
                throw new SalesInvoiceValidationException($"Enter a selling price for {partName}.");
            }

            return new SalesInvoiceItem
            {
                PartId = part?.PartId,
                PartName = partName,
                PartNumber = partNumber,
                Quantity = item.Quantity,
                UnitPrice = unitPrice,
                LineTotal = item.Quantity * unitPrice,
                Part = part
            };
        }).ToList();

        invoice.Subtotal = invoice.Items.Sum(item => item.LineTotal);
        invoice.DiscountAmount = invoice.Subtotal > LoyaltyThreshold
            ? Math.Round(invoice.Subtotal * LoyaltyDiscountRate, 2)
            : 0m;
        invoice.DiscountReason = invoice.DiscountAmount > 0
            ? "Loyalty discount: 10% for purchases above 5000"
            : string.Empty;
        invoice.TaxAmount = 0m;
        invoice.TotalAmount = invoice.Subtotal - invoice.DiscountAmount + invoice.TaxAmount;
    }

    private static void ApplyPayment(SalesInvoice invoice)
    {
        if (invoice.PaidAmount < 0)
        {
            throw new SalesInvoiceValidationException("Paid amount cannot be negative.");
        }

        if (invoice.PaidAmount > invoice.TotalAmount)
        {
            invoice.PaidAmount = invoice.TotalAmount;
        }

        invoice.CreditAmount = invoice.TotalAmount - invoice.PaidAmount;
        invoice.PaymentStatus = invoice.CreditAmount <= 0
            ? SalesInvoicePaymentStatus.Paid
            : invoice.PaidAmount > 0
                ? SalesInvoicePaymentStatus.PartiallyPaid
                : SalesInvoicePaymentStatus.Credit;

        if (invoice.PaymentStatus != SalesInvoicePaymentStatus.Paid
            && !invoice.DueDate.HasValue)
        {
            invoice.DueDate = DateTime.UtcNow.AddMonths(1);
        }
    }

    private static void ApplyStockDelta(
        IEnumerable<SalesInvoiceItem> items,
        IReadOnlyDictionary<int, Part> parts)
    {
        foreach (var item in items)
        {
            if (item.PartId.HasValue)
            {
                parts[item.PartId.Value].QuantityInStock -= item.Quantity;
            }
        }
    }

    private async Task<string> GenerateInvoiceNumberAsync(CancellationToken cancellationToken)
    {
        var datePrefix = $"SI-{DateTime.UtcNow:yyyyMMdd}";
        var count = await _db.SalesInvoices.CountAsync(
            invoice => invoice.InvoiceNumber.StartsWith(datePrefix),
            cancellationToken);

        return $"{datePrefix}-{count + 1:000}";
    }

    private async Task<bool> TrySendInvoiceEmailAsync(SalesInvoice invoice, CancellationToken cancellationToken)
    {
        try
        {
            await _emailService.SendBrandedAsync(
                new BrandedEmailMessage(
                    invoice.Customer.Email,
                    $"AutoCare invoice {invoice.InvoiceNumber}",
                    $"Your sales invoice {invoice.InvoiceNumber} is ready.",
                    "AutoCare Invoice",
                    BuildInvoiceEmailBody(invoice),
                    "View Invoice",
                    BuildCustomerHistoryUrl(),
                    BuildInvoiceTextBody(invoice),
                    invoice.Customer.FullName),
                cancellationToken);

            return true;
        }
        catch (Exception exception) when (exception is InvalidOperationException or SmtpException)
        {
            _logger.LogWarning(
                exception,
                "Sales invoice {InvoiceNumber} was created, but the email could not be sent.",
                invoice.InvoiceNumber);

            return false;
        }
    }

    private string BuildCustomerHistoryUrl()
    {
        return string.IsNullOrWhiteSpace(_emailOptions.AppBaseUrl)
            ? string.Empty
            : $"{_emailOptions.AppBaseUrl.TrimEnd('/')}/customer/history";
    }

    private static string BuildInvoiceEmailBody(SalesInvoice invoice)
    {
        var rows = string.Join(
            string.Empty,
            invoice.Items.Select(item => $"""
                <tr>
                  <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;">
                    <div style="font-weight:900;color:#111827;">{HtmlEncoder.Default.Encode(item.PartName)}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">{HtmlEncoder.Default.Encode(GetInvoiceItemPartNumberLabel(item))}</div>
                  </td>
                  <td align="center" style="padding:12px 10px;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:800;">{item.Quantity}</td>
                  <td align="right" style="padding:12px 10px;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:800;">{FormatMoney(item.UnitPrice)}</td>
                  <td align="right" style="padding:12px 10px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:900;">{FormatMoney(item.LineTotal)}</td>
                </tr>
                """));

        return $"""
               <p style="margin:0 0 18px;color:#111827;font-size:18px;line-height:26px;font-weight:900;">Hello {HtmlEncoder.Default.Encode(GetUserDisplayName(invoice.Customer))},</p>
               <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:24px;">Your AutoCare sales invoice has been created. Please review the invoice summary below.</p>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20px;border-collapse:separate;border-spacing:0;">
                 <tr>
                   <td style="width:50%;padding:14px;background:#111827;color:#ffffff;border-radius:10px 0 0 10px;">
                     <div style="font-size:12px;color:#d1d5db;text-transform:uppercase;font-weight:900;">Invoice</div>
                     <div style="margin-top:4px;font-size:20px;font-weight:900;">{HtmlEncoder.Default.Encode(invoice.InvoiceNumber)}</div>
                   </td>
                   <td style="width:50%;padding:14px;background:#ef1f2d;color:#ffffff;border-radius:0 10px 10px 0;text-align:right;">
                     <div style="font-size:12px;color:#ffe4e6;text-transform:uppercase;font-weight:900;">Amount Due</div>
                     <div style="margin-top:4px;font-size:20px;font-weight:900;">{FormatMoney(invoice.CreditAmount)}</div>
                   </td>
                 </tr>
               </table>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px;">
                 <thead>
                   <tr style="background:#f9fafb;">
                     <th align="left" style="padding:12px 10px;color:#6b7280;font-size:11px;text-transform:uppercase;">Part</th>
                     <th align="center" style="padding:12px 10px;color:#6b7280;font-size:11px;text-transform:uppercase;">Qty</th>
                     <th align="right" style="padding:12px 10px;color:#6b7280;font-size:11px;text-transform:uppercase;">Rate</th>
                     <th align="right" style="padding:12px 10px;color:#6b7280;font-size:11px;text-transform:uppercase;">Total</th>
                   </tr>
                 </thead>
                 <tbody>{rows}</tbody>
               </table>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                 {BuildTotalRow("Subtotal", invoice.Subtotal)}
                 {BuildTotalRow("Loyalty discount", -invoice.DiscountAmount)}
                 {BuildTotalRow("Paid", -invoice.PaidAmount)}
                 <tr>
                   <td style="padding:12px 0;border-top:2px solid #111827;color:#111827;font-size:16px;font-weight:900;">Balance</td>
                   <td align="right" style="padding:12px 0;border-top:2px solid #111827;color:#ef1f2d;font-size:18px;font-weight:900;">{FormatMoney(invoice.CreditAmount)}</td>
                 </tr>
               </table>
               <p style="margin:0;padding:14px 16px;background:#fff1f2;border-left:4px solid #ef1f2d;border-radius:8px;color:#1f2937;font-size:14px;line-height:22px;">Payment status: <strong>{invoice.PaymentStatus}</strong>. Thank you for choosing AutoCare.</p>
               """;
    }

    private static string BuildTotalRow(string label, decimal value)
    {
        return $"""
               <tr>
                 <td style="padding:6px 0;color:#4b5563;font-size:14px;font-weight:800;">{HtmlEncoder.Default.Encode(label)}</td>
                 <td align="right" style="padding:6px 0;color:#111827;font-size:14px;font-weight:900;">{FormatMoney(value)}</td>
               </tr>
               """;
    }

    private static string BuildInvoiceTextBody(SalesInvoice invoice)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Invoice {invoice.InvoiceNumber}");
        builder.AppendLine($"Customer: {GetUserDisplayName(invoice.Customer)}");
        builder.AppendLine();

        foreach (var item in invoice.Items)
        {
            builder.AppendLine($"{item.PartName} x{item.Quantity}: {FormatMoney(item.LineTotal)}");
        }

        builder.AppendLine();
        builder.AppendLine($"Subtotal: {FormatMoney(invoice.Subtotal)}");
        builder.AppendLine($"Discount: {FormatMoney(invoice.DiscountAmount)}");
        builder.AppendLine($"Paid: {FormatMoney(invoice.PaidAmount)}");
        builder.AppendLine($"Balance: {FormatMoney(invoice.CreditAmount)}");
        return builder.ToString();
    }

    private static string GetInvoiceItemPartNumberLabel(SalesInvoiceItem item)
    {
        return string.IsNullOrWhiteSpace(item.PartNumber)
            ? "Custom invoice line"
            : item.PartNumber;
    }

    private static DateTime ToUtcDateTime(DateTime value)
    {
        return value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static DateTime? ToUtcNullableDateTime(DateTime? value)
    {
        return value.HasValue ? ToUtcDateTime(value.Value) : null;
    }

    private static SalesInvoiceResponse ToResponse(SalesInvoice invoice)
    {
        return new SalesInvoiceResponse(
            invoice.SalesInvoiceId,
            invoice.InvoiceNumber,
            invoice.CustomerId,
            GetUserDisplayName(invoice.Customer),
            invoice.Customer?.Email ?? string.Empty,
            invoice.Customer?.Phone ?? string.Empty,
            invoice.StaffId,
            GetUserDisplayName(invoice.Staff),
            invoice.Staff?.Email ?? string.Empty,
            invoice.SourcePartRequestId,
            invoice.InvoiceDate,
            invoice.Subtotal,
            invoice.DiscountAmount,
            invoice.DiscountReason,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.CreditAmount,
            invoice.PaymentStatus,
            invoice.PaymentMethod,
            invoice.DueDate,
            invoice.Notes,
            invoice.EmailSent,
            invoice.IsCancelled,
            invoice.CreatedAt,
            invoice.UpdatedAt,
            invoice.Items
                .OrderBy(item => item.PartName)
                .Select(item => new SalesInvoiceItemResponse(
                    item.SalesInvoiceItemId,
                    item.PartId,
                    item.PartName,
                    item.PartNumber,
                    item.UnitPrice,
                    item.Quantity,
                    item.LineTotal))
                .ToArray());
    }

    private static string GetUserDisplayName(User? user)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        return user is null ? string.Empty : $"Customer #{user.Id}";
    }

    private static string FormatMoney(decimal value)
    {
        return $"Rs. {value:N2}";
    }
}
