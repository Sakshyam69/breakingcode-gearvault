using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.ServiceAppointments;

public sealed class CreateServiceAppointmentRequest
{
    [Required]
    public int VehicleId { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string ServiceType { get; set; } = string.Empty;

    [StringLength(120)]
    public string CustomServiceType { get; set; } = string.Empty;

    public ServiceAppointmentUrgency Urgency { get; set; } = ServiceAppointmentUrgency.Normal;

    [Required]
    public DateTime PreferredDate { get; set; }

    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string PreferredTimeSlot { get; set; } = string.Empty;

    [Range(0, 5000000)]
    public int? MileageAtBooking { get; set; }

    [Required]
    [StringLength(800, MinimumLength = 5)]
    public string ProblemDescription { get; set; } = string.Empty;

    [StringLength(500)]
    public string CustomerNote { get; set; } = string.Empty;
}

public sealed class UpdateServiceAppointmentStatusRequest
{
    [Required]
    public ServiceAppointmentStatus Status { get; set; }

    public int? AssignedStaffId { get; set; }

    public DateTime? ScheduledStartAt { get; set; }

    public DateTime? ScheduledEndAt { get; set; }

    [StringLength(500)]
    public string StaffNote { get; set; } = string.Empty;

    [StringLength(800)]
    public string DiagnosisNote { get; set; } = string.Empty;

    [StringLength(800)]
    public string CompletionNote { get; set; } = string.Empty;

    [StringLength(500)]
    public string CancellationReason { get; set; } = string.Empty;
}

public sealed class CancelServiceAppointmentRequest
{
    [StringLength(500)]
    public string CancellationReason { get; set; } = string.Empty;
}

public sealed record ServiceAppointmentResponse(
    int ServiceAppointmentId,
    string AppointmentNumber,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    int VehicleId,
    string VehicleLabel,
    string VehicleNumber,
    string VehicleMake,
    string VehicleModel,
    int? AssignedStaffId,
    string AssignedStaffName,
    string ServiceType,
    string CustomServiceType,
    string DisplayServiceType,
    ServiceAppointmentUrgency Urgency,
    ServiceAppointmentStatus Status,
    DateTime PreferredDate,
    string PreferredTimeSlot,
    DateTime? ScheduledStartAt,
    DateTime? ScheduledEndAt,
    int? MileageAtBooking,
    string ProblemDescription,
    string CustomerNote,
    string StaffNote,
    string DiagnosisNote,
    string CompletionNote,
    string CancelledByRole,
    string CancellationReason,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ConfirmedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime? CancelledAt,
    decimal CustomerCreditBalance,
    bool HasBookingInvoice);
