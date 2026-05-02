using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.BookingInvoices;

public sealed class CreateBookingInvoiceRequest
{
    [Required]
    public int ServiceAppointmentId { get; set; }

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    [Range(0.01, 999999999)]
    public decimal ServiceCharge { get; set; }

    [Range(0, 999999999)]
    public decimal DiscountAmount { get; set; }

    [Range(0, 999999999)]
    public decimal TaxAmount { get; set; }

    [Range(0, 999999999)]
    public decimal PaidAmount { get; set; }

    [Range(0, 999999999)]
    public decimal CustomerCreditAppliedAmount { get; set; }

    public BookingInvoicePaymentMethod PaymentMethod { get; set; } = BookingInvoicePaymentMethod.Cash;

    public DateTime? DueDate { get; set; }

    [StringLength(1000)]
    public string WorkSummary { get; set; } = string.Empty;

    [StringLength(1000)]
    public string DiagnosisNote { get; set; } = string.Empty;

    [StringLength(1000)]
    public string RecommendationNote { get; set; } = string.Empty;

    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;
}

public sealed record BookingInvoiceResponse(
    int BookingInvoiceId,
    string InvoiceNumber,
    int ServiceAppointmentId,
    string AppointmentNumber,
    string ServiceType,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int StaffId,
    string StaffName,
    string VehicleLabel,
    DateTime InvoiceDate,
    decimal ServiceCharge,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal CustomerCreditAppliedAmount,
    decimal CreditAmount,
    decimal ReturnAmount,
    decimal CustomerCreditAddedAmount,
    BookingInvoicePaymentStatus PaymentStatus,
    BookingInvoicePaymentMethod PaymentMethod,
    DateTime? DueDate,
    string WorkSummary,
    string DiagnosisNote,
    string RecommendationNote,
    string Notes,
    bool EmailSent,
    bool IsCancelled,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
