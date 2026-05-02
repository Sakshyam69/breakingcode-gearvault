namespace Servers.Models;

public enum CustomerReportType
{
    SalesOnly,
    ServicesOnly,
    Combined
}

public enum CustomerReportRequestStatus
{
    Pending,
    Sent,
    Cancelled
}

public sealed class CustomerReportRequest
{
    public int CustomerReportRequestId { get; set; }

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public CustomerReportType ReportType { get; set; } = CustomerReportType.Combined;

    public CustomerReportRequestStatus Status { get; set; } = CustomerReportRequestStatus.Pending;

    public string Notes { get; set; } = string.Empty;

    public string StaffNote { get; set; } = string.Empty;

    public int? CompletedByStaffId { get; set; }

    public User? CompletedByStaff { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }
}
