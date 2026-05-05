namespace Servers.DTOs.Admin;

public sealed record OverdueCreditCustomerResponse(
    int CustomerId,
    string FullName,
    string Email,
    decimal TotalOverdueAmount,
    int SalesInvoiceCount,
    int BookingInvoiceCount,
    DateTime OldestDueDate,
    DateTime LatestDueDate,
    DateTime? LastReminderAt);

