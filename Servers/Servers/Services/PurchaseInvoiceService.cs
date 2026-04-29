using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.PurchaseInvoices;
using Servers.Models;

namespace Servers.Services;

public interface IPurchaseInvoiceService
{
    Task<IReadOnlyCollection<PurchaseInvoiceResponse>> GetPurchaseInvoicesAsync(CancellationToken cancellationToken);

    Task<PurchaseInvoiceResponse?> GetPurchaseInvoiceAsync(int purchaseInvoiceId, CancellationToken cancellationToken);

    Task<PurchaseInvoiceResponse> CreatePurchaseInvoiceAsync(
        CreatePurchaseInvoiceRequest request,
        int userId,
        CancellationToken cancellationToken);

    Task<PurchaseInvoiceResponse?> UpdatePurchaseInvoiceAsync(
        int purchaseInvoiceId,
        UpdatePurchaseInvoiceRequest request,
        int userId,
        CancellationToken cancellationToken);

    Task<bool> CancelPurchaseInvoiceAsync(int purchaseInvoiceId, int userId, CancellationToken cancellationToken);
}

public sealed class PurchaseInvoiceValidationException : Exception
{
    public PurchaseInvoiceValidationException(string message)
        : base(message)
    {
    }
}

public sealed class PurchaseInvoiceService : IPurchaseInvoiceService
{
    private readonly AppDbContext _db;

    public PurchaseInvoiceService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<PurchaseInvoiceResponse>> GetPurchaseInvoicesAsync(
        CancellationToken cancellationToken)
    {
        var invoices = await QueryInvoices()
            .AsNoTracking()
            .OrderByDescending(invoice => invoice.PurchaseDate)
            .ThenByDescending(invoice => invoice.PurchaseInvoiceId)
            .ToArrayAsync(cancellationToken);

        return invoices.Select(ToResponse).ToArray();
    }

    public async Task<PurchaseInvoiceResponse?> GetPurchaseInvoiceAsync(
        int purchaseInvoiceId,
        CancellationToken cancellationToken)
    {
        var invoice = await QueryInvoices()
            .AsNoTracking()
            .FirstOrDefaultAsync(current => current.PurchaseInvoiceId == purchaseInvoiceId, cancellationToken);

        return invoice is null ? null : ToResponse(invoice);
    }

    public async Task<PurchaseInvoiceResponse> CreatePurchaseInvoiceAsync(
        CreatePurchaseInvoiceRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        await ValidateInvoiceNumberAsync(request.InvoiceNumber, null, cancellationToken);
        await ValidateVendorAsync(request.VendorId, cancellationToken);
        var parts = await GetValidatedPartsAsync(request.Items, cancellationToken);

        var invoice = new PurchaseInvoice
        {
            InvoiceNumber = request.InvoiceNumber.Trim(),
            VendorId = request.VendorId,
            PurchaseDate = ToUtcDateTime(request.PurchaseDate),
            PaymentStatus = request.PaymentStatus,
            DiscountAmount = request.DiscountAmount,
            TaxAmount = request.TaxAmount,
            Notes = request.Notes.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        ApplyItemsAndTotals(invoice, request.Items, parts);
        ApplyStockDelta(request.Items, parts, isIncrease: true);

        _db.PurchaseInvoices.Add(invoice);
        await _db.SaveChangesAsync(cancellationToken);

        var createdInvoice = await GetInvoiceWithDetailsAsync(invoice.PurchaseInvoiceId, cancellationToken);
        return ToResponse(createdInvoice ?? invoice);
    }

    public async Task<PurchaseInvoiceResponse?> UpdatePurchaseInvoiceAsync(
        int purchaseInvoiceId,
        UpdatePurchaseInvoiceRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        var invoice = await _db.PurchaseInvoices
            .Include(current => current.Items)
            .FirstOrDefaultAsync(current => current.PurchaseInvoiceId == purchaseInvoiceId, cancellationToken);

        if (invoice is null)
        {
            return null;
        }

        if (invoice.IsCancelled)
        {
            throw new PurchaseInvoiceValidationException("Cancelled purchase invoices cannot be updated.");
        }

        await ValidateInvoiceNumberAsync(request.InvoiceNumber, purchaseInvoiceId, cancellationToken);
        await ValidateVendorAsync(request.VendorId, cancellationToken);

        var existingPartIds = invoice.Items.Select(item => item.PartId);
        var requestedPartIds = request.Items.Select(item => item.PartId);
        var parts = await GetValidatedPartsAsync(existingPartIds.Concat(requestedPartIds), request.Items, cancellationToken);

        ApplyStockDelta(
            invoice.Items.Select(item => new PurchaseInvoiceItemRequest
            {
                PartId = item.PartId,
                Quantity = item.Quantity,
                UnitCost = item.UnitCost
            }),
            parts,
            isIncrease: false);

        invoice.InvoiceNumber = request.InvoiceNumber.Trim();
        invoice.VendorId = request.VendorId;
        invoice.PurchaseDate = ToUtcDateTime(request.PurchaseDate);
        invoice.PaymentStatus = request.PaymentStatus;
        invoice.DiscountAmount = request.DiscountAmount;
        invoice.TaxAmount = request.TaxAmount;
        invoice.Notes = request.Notes.Trim();
        invoice.UpdatedByUserId = userId;
        invoice.UpdatedAt = DateTime.UtcNow;

        _db.PurchaseInvoiceItems.RemoveRange(invoice.Items);
        invoice.Items.Clear();
        ApplyItemsAndTotals(invoice, request.Items, parts);
        ApplyStockDelta(request.Items, parts, isIncrease: true);

        await _db.SaveChangesAsync(cancellationToken);

        var updatedInvoice = await GetInvoiceWithDetailsAsync(invoice.PurchaseInvoiceId, cancellationToken);
        return ToResponse(updatedInvoice ?? invoice);
    }

    public async Task<bool> CancelPurchaseInvoiceAsync(
        int purchaseInvoiceId,
        int userId,
        CancellationToken cancellationToken)
    {
        var invoice = await _db.PurchaseInvoices
            .Include(current => current.Items)
            .FirstOrDefaultAsync(current => current.PurchaseInvoiceId == purchaseInvoiceId, cancellationToken);

        if (invoice is null)
        {
            return false;
        }

        if (invoice.IsCancelled)
        {
            return true;
        }

        var parts = await GetPartsByIdsAsync(invoice.Items.Select(item => item.PartId), cancellationToken);
        ApplyStockDelta(
            invoice.Items.Select(item => new PurchaseInvoiceItemRequest
            {
                PartId = item.PartId,
                Quantity = item.Quantity,
                UnitCost = item.UnitCost
            }),
            parts,
            isIncrease: false);

        invoice.IsCancelled = true;
        invoice.UpdatedByUserId = userId;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<PurchaseInvoice> QueryInvoices()
    {
        return _db.PurchaseInvoices
            .Include(invoice => invoice.Vendor)
            .Include(invoice => invoice.CreatedByUser)
            .Include(invoice => invoice.UpdatedByUser)
            .Include(invoice => invoice.Items)
                .ThenInclude(item => item.Part);
    }

    private Task<PurchaseInvoice?> GetInvoiceWithDetailsAsync(
        int purchaseInvoiceId,
        CancellationToken cancellationToken)
    {
        return QueryInvoices()
            .AsNoTracking()
            .FirstOrDefaultAsync(invoice => invoice.PurchaseInvoiceId == purchaseInvoiceId, cancellationToken);
    }

    private async Task ValidateInvoiceNumberAsync(
        string invoiceNumber,
        int? currentPurchaseInvoiceId,
        CancellationToken cancellationToken)
    {
        var normalizedInvoiceNumber = invoiceNumber.Trim();
        var exists = await _db.PurchaseInvoices.AnyAsync(invoice =>
            invoice.InvoiceNumber == normalizedInvoiceNumber
            && (!currentPurchaseInvoiceId.HasValue
                || invoice.PurchaseInvoiceId != currentPurchaseInvoiceId.Value),
            cancellationToken);

        if (exists)
        {
            throw new PurchaseInvoiceValidationException($"Invoice number '{normalizedInvoiceNumber}' is already in use.");
        }
    }

    private async Task ValidateVendorAsync(int vendorId, CancellationToken cancellationToken)
    {
        var exists = await _db.Vendors.AnyAsync(
            vendor => vendor.VendorId == vendorId && vendor.IsActive,
            cancellationToken);

        if (!exists)
        {
            throw new PurchaseInvoiceValidationException("Selected vendor was not found.");
        }
    }

    private Task<Dictionary<int, Part>> GetValidatedPartsAsync(
        IReadOnlyCollection<PurchaseInvoiceItemRequest> items,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            throw new PurchaseInvoiceValidationException("Add at least one invoice item.");
        }

        var duplicatePartId = items
            .GroupBy(item => item.PartId)
            .FirstOrDefault(group => group.Count() > 1)
            ?.Key;

        if (duplicatePartId.HasValue)
        {
            throw new PurchaseInvoiceValidationException("Each part can appear only once in a purchase invoice.");
        }

        return GetValidatedPartsAsync(items.Select(item => item.PartId), items, cancellationToken);
    }

    private async Task<Dictionary<int, Part>> GetValidatedPartsAsync(
        IEnumerable<int> partIds,
        IReadOnlyCollection<PurchaseInvoiceItemRequest> requestedItems,
        CancellationToken cancellationToken)
    {
        var parts = await GetPartsByIdsAsync(partIds, cancellationToken);
        var missingPartId = requestedItems.Select(item => item.PartId).FirstOrDefault(partId => !parts.ContainsKey(partId));

        if (missingPartId != 0)
        {
            throw new PurchaseInvoiceValidationException($"Part #{missingPartId} was not found.");
        }

        return parts;
    }

    private async Task<Dictionary<int, Part>> GetPartsByIdsAsync(
        IEnumerable<int> partIds,
        CancellationToken cancellationToken)
    {
        var distinctPartIds = partIds.Distinct().ToArray();
        return await _db.Parts
            .Where(part => distinctPartIds.Contains(part.PartId) && part.IsActive)
            .ToDictionaryAsync(part => part.PartId, cancellationToken);
    }

    private static void ApplyItemsAndTotals(
        PurchaseInvoice invoice,
        IReadOnlyCollection<PurchaseInvoiceItemRequest> items,
        IReadOnlyDictionary<int, Part> parts)
    {
        invoice.Items = items.Select(item => new PurchaseInvoiceItem
        {
            PartId = item.PartId,
            Quantity = item.Quantity,
            UnitCost = item.UnitCost,
            LineTotal = item.Quantity * item.UnitCost,
            Part = parts[item.PartId]
        }).ToList();

        invoice.Subtotal = invoice.Items.Sum(item => item.LineTotal);
        invoice.TotalAmount = invoice.Subtotal - invoice.DiscountAmount + invoice.TaxAmount;

        if (invoice.TotalAmount < 0)
        {
            throw new PurchaseInvoiceValidationException("Invoice total cannot be negative.");
        }
    }

    private static void ApplyStockDelta(
        IEnumerable<PurchaseInvoiceItemRequest> items,
        IReadOnlyDictionary<int, Part> parts,
        bool isIncrease)
    {
        foreach (var item in items)
        {
            var part = parts[item.PartId];
            var quantityDelta = isIncrease ? item.Quantity : -item.Quantity;
            var updatedQuantity = part.QuantityInStock + quantityDelta;

            if (updatedQuantity < 0)
            {
                throw new PurchaseInvoiceValidationException(
                    $"Cancelling or updating this invoice would make stock negative for {part.Name}.");
            }

            part.QuantityInStock = updatedQuantity;
        }
    }

    private static DateTime ToUtcDateTime(DateTime value)
    {
        return value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static PurchaseInvoiceResponse ToResponse(PurchaseInvoice invoice)
    {
        return new PurchaseInvoiceResponse(
            invoice.PurchaseInvoiceId,
            invoice.InvoiceNumber,
            invoice.VendorId,
            invoice.Vendor?.Name ?? string.Empty,
            invoice.PurchaseDate,
            invoice.PaymentStatus,
            invoice.Subtotal,
            invoice.DiscountAmount,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.Notes,
            invoice.IsCancelled,
            invoice.CreatedByUserId,
            invoice.UpdatedByUserId,
            GetUserDisplayName(invoice.CreatedByUser, invoice.CreatedByUserId),
            invoice.CreatedByUser?.Email ?? string.Empty,
            GetUserRole(invoice.CreatedByUser),
            GetUserDisplayName(invoice.UpdatedByUser, invoice.UpdatedByUserId),
            invoice.UpdatedByUser?.Email ?? string.Empty,
            GetUserRole(invoice.UpdatedByUser),
            invoice.CreatedAt,
            invoice.UpdatedAt,
            invoice.Items
                .OrderBy(item => item.Part?.Name)
                .Select(item => new PurchaseInvoiceItemResponse(
                    item.PurchaseInvoiceItemId,
                    item.PartId,
                    item.Part?.Name ?? string.Empty,
                    item.Part?.PartNumber ?? string.Empty,
                    item.Part?.Brand ?? string.Empty,
                    item.Part?.Category ?? string.Empty,
                    item.Quantity,
                    item.UnitCost,
                    item.LineTotal))
                .ToArray());
    }

    private static string GetUserDisplayName(User? user, int? userId)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        if (!string.IsNullOrWhiteSpace(user?.Email))
        {
            return user.Email;
        }

        return userId.HasValue ? $"User #{userId.Value}" : string.Empty;
    }

    private static string GetUserRole(User? user)
    {
        return user is null ? string.Empty : user.Role.ToString();
    }
}
