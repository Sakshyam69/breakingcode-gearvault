namespace Servers.Models;

public enum ReviewStatus
{
    Pending,
    Approved,
    Rejected
}

public sealed class Review
{
    public int ReviewId { get; set; }

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public int ServiceAppointmentId { get; set; }

    public ServiceAppointment ServiceAppointment { get; set; } = null!;

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
