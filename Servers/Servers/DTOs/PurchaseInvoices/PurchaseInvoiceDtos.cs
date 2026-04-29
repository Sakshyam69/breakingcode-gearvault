using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.PurchaseInvoices;

public sealed class PurchaseInvoiceItemRequest
{
    [Range(1, int.MaxValue)]
    public int PartId { get; set; }

    [Range(1, 1000000)]
    public int Quantity { get; set; }

    [Range(0, 999999999)]
    public decimal UnitCost { get; set; }
}

public class CreatePurchaseInvoiceRequest
{
    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int VendorId { get; set; }

    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

    public PurchasePaymentStatus PaymentStatus { get; set; } = PurchasePaymentStatus.Unpaid;

    [Range(0, 999999999)]
    public decimal DiscountAmount { get; set; }

    [Range(0, 999999999)]
    public decimal TaxAmount { get; set; }

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;

    [MinLength(1)]
    public List<PurchaseInvoiceItemRequest> Items { get; set; } = [];
}

public sealed class UpdatePurchaseInvoiceRequest : CreatePurchaseInvoiceRequest
{
}

public sealed record PurchaseInvoiceResponse(
    int PurchaseInvoiceId,
    string InvoiceNumber,
    int VendorId,
    string VendorName,
    DateTime PurchaseDate,
    PurchasePaymentStatus PaymentStatus,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    string Notes,
    bool IsCancelled,
    int? CreatedByUserId,
    int? UpdatedByUserId,
    string CreatedByUserName,
    string CreatedByUserEmail,
    string CreatedByUserRole,
    string UpdatedByUserName,
    string UpdatedByUserEmail,
    string UpdatedByUserRole,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyCollection<PurchaseInvoiceItemResponse> Items);

public sealed record PurchaseInvoiceItemResponse(
    int PurchaseInvoiceItemId,
    int PartId,
    string PartName,
    string PartNumber,
    string Brand,
    string Category,
    int Quantity,
    decimal UnitCost,
    decimal LineTotal);
