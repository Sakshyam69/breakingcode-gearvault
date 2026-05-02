namespace Servers.Models;

public enum BookingInvoicePaymentStatus
{
    Paid,
    Credit,
    PartiallyPaid,
    Overdue,
    Cancelled
}

public enum BookingInvoicePaymentMethod
{
    Cash,
    Card,
    Online,
    Credit
}

public sealed class BookingInvoice
{
    public int BookingInvoiceId { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;

    public int ServiceAppointmentId { get; set; }

    public ServiceAppointment ServiceAppointment { get; set; } = null!;

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public int StaffId { get; set; }

    public User Staff { get; set; } = null!;

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    public decimal ServiceCharge { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal CustomerCreditAppliedAmount { get; set; }

    public decimal CreditAmount { get; set; }

    public decimal ReturnAmount { get; set; }

    public decimal CustomerCreditAddedAmount { get; set; }

    public BookingInvoicePaymentStatus PaymentStatus { get; set; } = BookingInvoicePaymentStatus.Paid;

    public BookingInvoicePaymentMethod PaymentMethod { get; set; } = BookingInvoicePaymentMethod.Cash;

    public DateTime? DueDate { get; set; }

    public string WorkSummary { get; set; } = string.Empty;

    public string DiagnosisNote { get; set; } = string.Empty;

    public string RecommendationNote { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public bool EmailSent { get; set; }

    public bool IsCancelled { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
