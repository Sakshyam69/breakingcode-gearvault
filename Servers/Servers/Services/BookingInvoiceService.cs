using System.Net.Mail;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Servers.Configuration;
using Servers.Data;
using Servers.DTOs.BookingInvoices;
using Servers.Models;

namespace Servers.Services;

public interface IBookingInvoiceService
{
    Task<IReadOnlyCollection<BookingInvoiceResponse>> GetInvoicesAsync(
        string? query,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<BookingInvoiceResponse>> GetCustomerInvoicesAsync(
        int customerId,
        CancellationToken cancellationToken);

    Task<BookingInvoiceResponse?> GetInvoiceAsync(
        int bookingInvoiceId,
        int? requiredCustomerId,
        CancellationToken cancellationToken);

    Task<BookingInvoiceResponse> CreateInvoiceAsync(
        CreateBookingInvoiceRequest request,
        int staffId,
        CancellationToken cancellationToken);
}

public sealed class BookingInvoiceValidationException : Exception
{
    public BookingInvoiceValidationException(string message)
        : base(message)
    {
    }
}

public sealed class BookingInvoiceService : IBookingInvoiceService
{
    private readonly AppDbContext _db;
    private readonly ICustomerCreditService _customerCredits;
    private readonly IEmailService _emailService;
    private readonly INotificationService _notifications;
    private readonly BrevoEmailOptions _emailOptions;
    private readonly ILogger<BookingInvoiceService> _logger;

    public BookingInvoiceService(
        AppDbContext db,
        ICustomerCreditService customerCredits,
        IEmailService emailService,
        INotificationService notifications,
        IOptions<BrevoEmailOptions> emailOptions,
        ILogger<BookingInvoiceService> logger)
    {
        _db = db;
        _customerCredits = customerCredits;
        _emailService = emailService;
        _notifications = notifications;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<BookingInvoiceResponse>> GetInvoicesAsync(
        string? query,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var invoicesQuery = QueryInvoices().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            invoicesQuery = invoicesQuery.Where(invoice =>
                invoice.InvoiceNumber.ToLower().Contains(normalizedQuery)
                || invoice.ServiceAppointment.AppointmentNumber.ToLower().Contains(normalizedQuery)
                || invoice.ServiceAppointment.ServiceType.ToLower().Contains(normalizedQuery)
                || invoice.ServiceAppointment.CustomServiceType.ToLower().Contains(normalizedQuery)
                || invoice.Customer.FullName.ToLower().Contains(normalizedQuery)
                || invoice.Customer.Email.ToLower().Contains(normalizedQuery)
                || invoice.Customer.Phone.ToLower().Contains(normalizedQuery)
                || invoice.ServiceAppointment.Vehicle.VehicleNumber.ToLower().Contains(normalizedQuery));
        }

        var invoices = await invoicesQuery
            .OrderByDescending(invoice => invoice.InvoiceDate)
            .ThenByDescending(invoice => invoice.BookingInvoiceId)
            .Take(150)
            .ToArrayAsync(cancellationToken);

        return invoices.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<BookingInvoiceResponse>> GetCustomerInvoicesAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var invoices = await QueryInvoices()
            .AsNoTracking()
            .Where(invoice => invoice.CustomerId == customerId)
            .OrderByDescending(invoice => invoice.InvoiceDate)
            .ThenByDescending(invoice => invoice.BookingInvoiceId)
            .ToArrayAsync(cancellationToken);

        return invoices.Select(ToResponse).ToArray();
    }

    public async Task<BookingInvoiceResponse?> GetInvoiceAsync(
        int bookingInvoiceId,
        int? requiredCustomerId,
        CancellationToken cancellationToken)
    {
        var invoice = await QueryInvoices()
            .AsNoTracking()
            .FirstOrDefaultAsync(current =>
                current.BookingInvoiceId == bookingInvoiceId
                && (!requiredCustomerId.HasValue || current.CustomerId == requiredCustomerId.Value),
                cancellationToken);

        return invoice is null ? null : ToResponse(invoice);
    }

    public async Task<BookingInvoiceResponse> CreateInvoiceAsync(
        CreateBookingInvoiceRequest request,
        int staffId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.ServiceAppointments
            .Include(current => current.Customer)
            .Include(current => current.Vehicle)
            .FirstOrDefaultAsync(current => current.ServiceAppointmentId == request.ServiceAppointmentId, cancellationToken);

        if (appointment is null)
        {
            throw new BookingInvoiceValidationException("Service appointment was not found.");
        }

        if (appointment.Status != ServiceAppointmentStatus.Completed)
        {
            throw new BookingInvoiceValidationException("Only completed service appointments can be invoiced.");
        }

        var alreadyInvoiced = await _db.BookingInvoices.AnyAsync(
            invoice => invoice.ServiceAppointmentId == appointment.ServiceAppointmentId,
            cancellationToken);

        if (alreadyInvoiced)
        {
            throw new BookingInvoiceValidationException("This service appointment already has a booking invoice.");
        }

        var invoice = new BookingInvoice
        {
            InvoiceNumber = await GenerateInvoiceNumberAsync(cancellationToken),
            ServiceAppointmentId = appointment.ServiceAppointmentId,
            CustomerId = appointment.CustomerId,
            StaffId = staffId,
            InvoiceDate = ToUtcDateTime(request.InvoiceDate),
            ServiceCharge = request.ServiceCharge,
            DiscountAmount = request.DiscountAmount,
            TaxAmount = request.TaxAmount,
            PaidAmount = request.PaidAmount,
            CustomerCreditAppliedAmount = request.CustomerCreditAppliedAmount,
            PaymentMethod = request.PaymentMethod,
            DueDate = ToUtcNullableDateTime(request.DueDate),
            WorkSummary = request.WorkSummary.Trim(),
            DiagnosisNote = request.DiagnosisNote.Trim(),
            RecommendationNote = request.RecommendationNote.Trim(),
            Notes = request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await ValidateCustomerCreditAsync(invoice.CustomerId, invoice.CustomerCreditAppliedAmount, cancellationToken);
        ApplyTotals(invoice);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            _db.BookingInvoices.Add(invoice);
            await _db.SaveChangesAsync(cancellationToken);

            await ApplyCustomerCreditMovementsAsync(invoice, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        }
        catch (CustomerCreditValidationException exception)
        {
            throw new BookingInvoiceValidationException(exception.Message);
        }

        var savedInvoice = await GetInvoiceWithDetailsAsync(invoice.BookingInvoiceId, cancellationToken) ?? invoice;
        savedInvoice.EmailSent = await TrySendInvoiceEmailAsync(savedInvoice, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForUserAsync(
            savedInvoice.CustomerId,
            "BookingInvoiceCreated",
            "Service invoice ready",
            $"Service invoice {savedInvoice.InvoiceNumber} is ready for your review.",
            "/customer/history",
            nameof(BookingInvoice),
            savedInvoice.BookingInvoiceId,
            cancellationToken);

        return ToResponse(savedInvoice);
    }

    private IQueryable<BookingInvoice> QueryInvoices()
    {
        return _db.BookingInvoices
            .Include(invoice => invoice.Customer)
            .Include(invoice => invoice.Staff)
            .Include(invoice => invoice.ServiceAppointment)
                .ThenInclude(appointment => appointment.Vehicle);
    }

    private Task<BookingInvoice?> GetInvoiceWithDetailsAsync(
        int bookingInvoiceId,
        CancellationToken cancellationToken)
    {
        return QueryInvoices()
            .FirstOrDefaultAsync(invoice => invoice.BookingInvoiceId == bookingInvoiceId, cancellationToken);
    }

    private async Task ValidateCustomerCreditAsync(
        int customerId,
        decimal customerCreditAppliedAmount,
        CancellationToken cancellationToken)
    {
        if (customerCreditAppliedAmount < 0)
        {
            throw new BookingInvoiceValidationException("Applied customer credit cannot be negative.");
        }

        var creditBalance = await _customerCredits.GetBalanceAsync(customerId, cancellationToken);
        if (customerCreditAppliedAmount > creditBalance)
        {
            throw new BookingInvoiceValidationException("Applied customer credit is more than the customer's available credit.");
        }
    }

    private static void ApplyTotals(BookingInvoice invoice)
    {
        invoice.TotalAmount = invoice.ServiceCharge - invoice.DiscountAmount + invoice.TaxAmount;
        if (invoice.TotalAmount < 0)
        {
            throw new BookingInvoiceValidationException("Invoice total cannot be negative.");
        }

        if (invoice.PaidAmount < 0)
        {
            throw new BookingInvoiceValidationException("Paid amount cannot be negative.");
        }

        invoice.CustomerCreditAppliedAmount = Math.Min(invoice.CustomerCreditAppliedAmount, invoice.TotalAmount);

        var payableAmount = Math.Max(invoice.TotalAmount - invoice.CustomerCreditAppliedAmount, 0m);
        invoice.CreditAmount = Math.Max(payableAmount - invoice.PaidAmount, 0m);
        invoice.ReturnAmount = Math.Max(invoice.PaidAmount - payableAmount, 0m);
        invoice.CustomerCreditAddedAmount = invoice.ReturnAmount;
        invoice.PaymentStatus = invoice.CreditAmount <= 0
            ? BookingInvoicePaymentStatus.Paid
            : invoice.PaidAmount > 0
                ? BookingInvoicePaymentStatus.PartiallyPaid
                : BookingInvoicePaymentStatus.Credit;

        if (invoice.PaymentStatus != BookingInvoicePaymentStatus.Paid && !invoice.DueDate.HasValue)
        {
            invoice.DueDate = DateTime.UtcNow.AddMonths(1);
        }
    }

    private async Task ApplyCustomerCreditMovementsAsync(
        BookingInvoice invoice,
        CancellationToken cancellationToken)
    {
        await _customerCredits.ApplyCreditAsync(
            invoice.CustomerId,
            invoice.CustomerCreditAppliedAmount,
            nameof(BookingInvoice),
            invoice.BookingInvoiceId,
            $"Credit applied to booking invoice {invoice.InvoiceNumber}.",
            cancellationToken);

        await _customerCredits.AddCreditAsync(
            invoice.CustomerId,
            invoice.CustomerCreditAddedAmount,
            nameof(BookingInvoice),
            invoice.BookingInvoiceId,
            $"Overpayment stored from booking invoice {invoice.InvoiceNumber}.",
            cancellationToken);
    }

    private async Task<string> GenerateInvoiceNumberAsync(CancellationToken cancellationToken)
    {
        var datePrefix = $"BI-{DateTime.UtcNow:yyyyMMdd}";
        var count = await _db.BookingInvoices.CountAsync(
            invoice => invoice.InvoiceNumber.StartsWith(datePrefix),
            cancellationToken);

        return $"{datePrefix}-{count + 1:000}";
    }

    private async Task<bool> TrySendInvoiceEmailAsync(BookingInvoice invoice, CancellationToken cancellationToken)
    {
        try
        {
            await _emailService.SendBrandedAsync(
                new BrandedEmailMessage(
                    invoice.Customer.Email,
                    $"AutoCare service invoice {invoice.InvoiceNumber}",
                    $"Your service invoice {invoice.InvoiceNumber} is ready.",
                    "AutoCare Service Invoice",
                    BuildInvoiceEmailBody(invoice),
                    "View Invoice",
                    BuildCustomerHistoryUrl(),
                    BuildInvoiceTextBody(invoice),
                    GetUserDisplayName(invoice.Customer)),
                cancellationToken);

            return true;
        }
        catch (Exception exception) when (exception is InvalidOperationException or SmtpException)
        {
            _logger.LogWarning(
                exception,
                "Booking invoice {InvoiceNumber} was created, but the email could not be sent.",
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

    private static string BuildInvoiceEmailBody(BookingInvoice invoice)
    {
        var serviceType = HtmlEncoder.Default.Encode(GetDisplayServiceType(invoice.ServiceAppointment));
        var vehicle = HtmlEncoder.Default.Encode(GetVehicleLabel(invoice.ServiceAppointment?.Vehicle));

        return $"""
               <p style="margin:0 0 18px;color:#111827;font-size:18px;line-height:26px;font-weight:900;">Hello {HtmlEncoder.Default.Encode(GetUserDisplayName(invoice.Customer))},</p>
               <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:24px;">Your AutoCare service invoice has been created. Please review the invoice summary below.</p>
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
                 <tr>
                   <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;">
                     <div style="font-weight:900;color:#111827;">{serviceType}</div>
                     <div style="font-size:12px;color:#6b7280;margin-top:2px;">{vehicle}</div>
                   </td>
                   <td align="right" style="padding:12px 10px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:900;">{FormatMoney(invoice.ServiceCharge)}</td>
                 </tr>
               </table>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                 {BuildTotalRow("Service charge", invoice.ServiceCharge)}
                 {BuildTotalRow("Discount", -invoice.DiscountAmount)}
                 {BuildTotalRow("Tax", invoice.TaxAmount)}
                 {BuildTotalRow("Customer credit applied", -invoice.CustomerCreditAppliedAmount)}
                 {BuildTotalRow("Paid", -invoice.PaidAmount)}
                 {BuildTotalRow("Stored customer credit", invoice.CustomerCreditAddedAmount)}
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

    private static string BuildInvoiceTextBody(BookingInvoice invoice)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Invoice {invoice.InvoiceNumber}");
        builder.AppendLine($"Customer: {GetUserDisplayName(invoice.Customer)}");
        builder.AppendLine($"Service: {GetDisplayServiceType(invoice.ServiceAppointment)}");
        builder.AppendLine($"Vehicle: {GetVehicleLabel(invoice.ServiceAppointment?.Vehicle)}");
        builder.AppendLine();
        builder.AppendLine($"Service charge: {FormatMoney(invoice.ServiceCharge)}");
        builder.AppendLine($"Discount: {FormatMoney(invoice.DiscountAmount)}");
        builder.AppendLine($"Tax: {FormatMoney(invoice.TaxAmount)}");
        builder.AppendLine($"Customer credit applied: {FormatMoney(invoice.CustomerCreditAppliedAmount)}");
        builder.AppendLine($"Paid: {FormatMoney(invoice.PaidAmount)}");
        builder.AppendLine($"Balance: {FormatMoney(invoice.CreditAmount)}");
        builder.AppendLine($"Stored customer credit: {FormatMoney(invoice.CustomerCreditAddedAmount)}");
        return builder.ToString();
    }

    private static BookingInvoiceResponse ToResponse(BookingInvoice invoice)
    {
        var appointment = invoice.ServiceAppointment;
        return new BookingInvoiceResponse(
            invoice.BookingInvoiceId,
            invoice.InvoiceNumber,
            invoice.ServiceAppointmentId,
            appointment?.AppointmentNumber ?? string.Empty,
            GetDisplayServiceType(appointment),
            invoice.CustomerId,
            GetUserDisplayName(invoice.Customer),
            invoice.Customer?.Email ?? string.Empty,
            invoice.Customer?.Phone ?? string.Empty,
            invoice.StaffId,
            GetUserDisplayName(invoice.Staff),
            GetVehicleLabel(appointment?.Vehicle),
            invoice.InvoiceDate,
            invoice.ServiceCharge,
            invoice.DiscountAmount,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.CustomerCreditAppliedAmount,
            invoice.CreditAmount,
            invoice.ReturnAmount,
            invoice.CustomerCreditAddedAmount,
            invoice.PaymentStatus,
            invoice.PaymentMethod,
            invoice.DueDate,
            invoice.WorkSummary,
            invoice.DiagnosisNote,
            invoice.RecommendationNote,
            invoice.Notes,
            invoice.EmailSent,
            invoice.IsCancelled,
            invoice.CreatedAt,
            invoice.UpdatedAt);
    }

    private static string GetDisplayServiceType(ServiceAppointment? appointment)
    {
        if (appointment is null)
        {
            return string.Empty;
        }

        return string.Equals(appointment.ServiceType, "Other", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(appointment.CustomServiceType)
            ? appointment.CustomServiceType
            : appointment.ServiceType;
    }

    private static string GetVehicleLabel(CustomerVehicle? vehicle)
    {
        return vehicle is null ? string.Empty : $"{vehicle.VehicleNumber} - {vehicle.Make} {vehicle.Model}".Trim();
    }

    private static string GetUserDisplayName(User? user)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        return user?.Email ?? string.Empty;
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

    private static string FormatMoney(decimal value)
    {
        return $"Rs. {value:N2}";
    }
}
