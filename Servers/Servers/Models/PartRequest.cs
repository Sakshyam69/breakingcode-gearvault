namespace Servers.Models;

public enum PartRequestUrgency
{
    Low,
    Normal,
    High,
    Urgent
}

public enum PartRequestStatus
{
    Pending,
    Available,
    Unavailable,
    Rejected,
    Invoiced,
    Cancelled,
    ConvertedToInvoice
}

public sealed class PartRequest
{
    public int PartRequestId { get; set; }

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public int? VehicleId { get; set; }

    public CustomerVehicle? Vehicle { get; set; }

    public int? RequestedPartId { get; set; }

    public Part? RequestedPart { get; set; }

    public string PartName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public PartRequestUrgency Urgency { get; set; } = PartRequestUrgency.Normal;

    public PartRequestStatus Status { get; set; } = PartRequestStatus.Pending;

    public string StaffNote { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? ResolvedAt { get; set; }
}
