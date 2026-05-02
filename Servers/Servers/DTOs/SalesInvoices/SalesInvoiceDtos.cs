using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.SalesInvoices;

public sealed class CreateSalesInvoiceRequest
{
    [Required]
    public int CustomerId { get; set; }

    public int? SourcePartRequestId { get; set; }

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    [Range(0, 999999999)]
    public decimal PaidAmount { get; set; }

    [Range(0, 999999999)]
    public decimal CustomerCreditAppliedAmount { get; set; }

    public SalesInvoicePaymentMethod PaymentMethod { get; set; } = SalesInvoicePaymentMethod.Cash;

    public DateTime? DueDate { get; set; }

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public List<SalesInvoiceItemRequest> Items { get; set; } = [];
}

public sealed class CreateSalesInvoiceFromPartRequestRequest
{
    [Range(0, 999999999)]
    public decimal PaidAmount { get; set; }

    [Range(0, 999999999)]
    public decimal CustomerCreditAppliedAmount { get; set; }

    public SalesInvoicePaymentMethod PaymentMethod { get; set; } = SalesInvoicePaymentMethod.Cash;

    public DateTime? DueDate { get; set; }

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public List<SalesInvoiceItemRequest> Items { get; set; } = [];
}

public sealed class SalesInvoiceItemRequest
{
    public int? PartId { get; set; }

    [StringLength(150)]
    public string PartName { get; set; } = string.Empty;

    [StringLength(100)]
    public string PartNumber { get; set; } = string.Empty;

    [Range(0, 999999999)]
    public decimal UnitPrice { get; set; }

    [Range(1, 100000)]
    public int Quantity { get; set; } = 1;
}

public sealed record SalesInvoiceResponse(
    int SalesInvoiceId,
    string InvoiceNumber,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int StaffId,
    string StaffName,
    string StaffEmail,
    int? SourcePartRequestId,
    DateTime InvoiceDate,
    decimal Subtotal,
    decimal DiscountAmount,
    string DiscountReason,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal CustomerCreditAppliedAmount,
    decimal CreditAmount,
    decimal ReturnAmount,
    decimal CustomerCreditAddedAmount,
    SalesInvoicePaymentStatus PaymentStatus,
    SalesInvoicePaymentMethod PaymentMethod,
    DateTime? DueDate,
    string Notes,
    bool EmailSent,
    bool IsCancelled,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyCollection<SalesInvoiceItemResponse> Items);

public sealed record SalesInvoiceItemResponse(
    int SalesInvoiceItemId,
    int? PartId,
    string PartName,
    string PartNumber,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);
