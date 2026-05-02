using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.PartRequests;

public sealed class CreatePartRequestRequest
{
    public int? VehicleId { get; set; }

    public int? RequestedPartId { get; set; }

    [StringLength(150)]
    public string PartName { get; set; } = string.Empty;

    [StringLength(100)]
    public string PartNumber { get; set; } = string.Empty;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    [Range(1, 100000)]
    public int Quantity { get; set; } = 1;

    public PartRequestUrgency Urgency { get; set; } = PartRequestUrgency.Normal;
}

public sealed class UpdatePartRequestStatusRequest
{
    [Required]
    public PartRequestStatus Status { get; set; }

    [StringLength(500)]
    public string StaffNote { get; set; } = string.Empty;
}

public sealed record PartRequestResponse(
    int PartRequestId,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int? VehicleId,
    string VehicleLabel,
    int? RequestedPartId,
    string PartName,
    string PartNumber,
    string Description,
    int Quantity,
    PartRequestUrgency Urgency,
    PartRequestStatus Status,
    string StaffNote,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ResolvedAt);
