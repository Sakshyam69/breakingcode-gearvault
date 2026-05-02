using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.CustomerReports;

public sealed record CustomerReportSummaryResponse(
    int TotalCustomers,
    int ActiveCustomers,
    decimal TotalSalesRevenue,
    decimal TotalServiceRevenue,
    decimal TotalRevenue,
    decimal TotalPendingCredit,
    int SalesInvoiceCount,
    int BookingInvoiceCount,
    int ServiceAppointmentCount,
    int PartRequestCount);

public sealed record CustomerReportRowResponse(
    int CustomerId,
    string CustomerName,
    string Email,
    string Phone,
    int VehicleCount,
    string VehicleNumbers,
    decimal SalesSpent,
    decimal ServiceSpent,
    decimal TotalSpent,
    decimal SalesCredit,
    decimal ServiceCredit,
    decimal TotalCredit,
    int SalesInvoiceCount,
    int BookingInvoiceCount,
    int ServiceAppointmentCount,
    int CompletedServiceCount,
    int PartRequestCount,
    DateTime? LastActivityAt,
    string Segment,
    string Icon,
    IReadOnlyCollection<CustomerReportSalesDetailResponse> SalesDetails,
    IReadOnlyCollection<CustomerReportServiceDetailResponse> ServiceDetails);

public sealed record CustomerReportSalesDetailResponse(
    int SalesInvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string PaymentStatus,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal CreditAmount,
    string Items);

public sealed record CustomerReportServiceDetailResponse(
    int BookingInvoiceId,
    string InvoiceNumber,
    string AppointmentNumber,
    DateTime InvoiceDate,
    string ServiceType,
    string VehicleLabel,
    string PaymentStatus,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal CreditAmount,
    string WorkSummary);

public sealed record CustomerReportsResponse(
    CustomerReportSummaryResponse Summary,
    IReadOnlyCollection<CustomerReportRowResponse> HighSpenders,
    IReadOnlyCollection<CustomerReportRowResponse> RegularCustomers,
    IReadOnlyCollection<CustomerReportRowResponse> PendingCredits,
    IReadOnlyCollection<CustomerReportRowResponse> PartsCustomers,
    IReadOnlyCollection<CustomerReportRowResponse> ServiceCustomers,
    IReadOnlyCollection<CustomerReportRowResponse> AllCustomers);

public sealed class CreateCustomerReportRequestRequest
{
    public CustomerReportType ReportType { get; set; } = CustomerReportType.Combined;

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}

public sealed class CompleteCustomerReportRequestRequest
{
    [StringLength(500)]
    public string StaffNote { get; set; } = string.Empty;
}

public sealed record CustomerReportRequestResponse(
    int CustomerReportRequestId,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    CustomerReportType ReportType,
    CustomerReportRequestStatus Status,
    string Notes,
    string StaffNote,
    int? CompletedByStaffId,
    string CompletedByStaffName,
    DateTime CreatedAt,
    DateTime? CompletedAt);
