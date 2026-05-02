namespace Servers.Models;

public enum SalesInvoicePaymentStatus
{
    Paid,
    Credit,
    PartiallyPaid,
    Overdue,
    Cancelled
}

public enum SalesInvoicePaymentMethod
{
    Cash,
    Card,
    Online,
    Credit
}

public sealed class SalesInvoice
{
    public int SalesInvoiceId { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public int StaffId { get; set; }

    public User Staff { get; set; } = null!;

    public int? SourcePartRequestId { get; set; }

    public PartRequest? SourcePartRequest { get; set; }

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    public decimal Subtotal { get; set; }

    public decimal DiscountAmount { get; set; }

    public string DiscountReason { get; set; } = string.Empty;

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal CreditAmount { get; set; }

    public SalesInvoicePaymentStatus PaymentStatus { get; set; } = SalesInvoicePaymentStatus.Paid;

    public SalesInvoicePaymentMethod PaymentMethod { get; set; } = SalesInvoicePaymentMethod.Cash;

    public DateTime? DueDate { get; set; }

    public string Notes { get; set; } = string.Empty;

    public bool EmailSent { get; set; }

    public bool IsCancelled { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public List<SalesInvoiceItem> Items { get; set; } = [];
}
