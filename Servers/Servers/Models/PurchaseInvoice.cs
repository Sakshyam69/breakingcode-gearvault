namespace Servers.Models;

public enum PurchasePaymentStatus
{
    Unpaid = 0,
    Partial = 1,
    Paid = 2
}

public sealed class PurchaseInvoice
{
    public int PurchaseInvoiceId { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;

    public int VendorId { get; set; }

    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

    public PurchasePaymentStatus PaymentStatus { get; set; } = PurchasePaymentStatus.Unpaid;

    public decimal Subtotal { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public string Notes { get; set; } = string.Empty;

    public bool IsCancelled { get; set; }

    public int? CreatedByUserId { get; set; }

    public int? UpdatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public Vendor Vendor { get; set; } = null!;

    public User? CreatedByUser { get; set; }

    public User? UpdatedByUser { get; set; }

    public ICollection<PurchaseInvoiceItem> Items { get; set; } = new List<PurchaseInvoiceItem>();
}
