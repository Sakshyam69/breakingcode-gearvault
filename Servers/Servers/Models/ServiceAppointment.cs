namespace Servers.Models;

public enum ServiceAppointmentUrgency
{
    Low,
    Normal,
    High,
    Urgent
}

public enum ServiceAppointmentStatus
{
    Pending,
    Confirmed,
    InProgress,
    Completed,
    Cancelled,
    Rejected,
    NoShow
}

public sealed class ServiceAppointment
{
    public int ServiceAppointmentId { get; set; }

    public string AppointmentNumber { get; set; } = string.Empty;

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public int VehicleId { get; set; }

    public CustomerVehicle Vehicle { get; set; } = null!;

    public int? AssignedStaffId { get; set; }

    public User? AssignedStaff { get; set; }

    public BookingInvoice? BookingInvoice { get; set; }

    public string ServiceType { get; set; } = string.Empty;

    public string CustomServiceType { get; set; } = string.Empty;

    public ServiceAppointmentUrgency Urgency { get; set; } = ServiceAppointmentUrgency.Normal;

    public ServiceAppointmentStatus Status { get; set; } = ServiceAppointmentStatus.Pending;

    public DateTime PreferredDate { get; set; }

    public string PreferredTimeSlot { get; set; } = string.Empty;

    public DateTime? ScheduledStartAt { get; set; }

    public DateTime? ScheduledEndAt { get; set; }

    public int? MileageAtBooking { get; set; }

    public string ProblemDescription { get; set; } = string.Empty;

    public string CustomerNote { get; set; } = string.Empty;

    public string StaffNote { get; set; } = string.Empty;

    public string DiagnosisNote { get; set; } = string.Empty;

    public string CompletionNote { get; set; } = string.Empty;

    public string CancelledByRole { get; set; } = string.Empty;

    public string CancellationReason { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? ConfirmedAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? CancelledAt { get; set; }
}
