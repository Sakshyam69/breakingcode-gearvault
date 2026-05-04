using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.Reviews;

public sealed class CreateReviewRequest
{
    [Required]
    public int ServiceAppointmentId { get; set; }

    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }

    [Required]
    [StringLength(1000, MinimumLength = 10)]
    public string Comment { get; set; } = string.Empty;
}

public sealed class UpdateReviewStatusRequest
{
    [Required]
    public ReviewStatus Status { get; set; }
}

public sealed record ReviewResponse(
    int ReviewId,
    int CustomerId,
    string CustomerName,
    int ServiceAppointmentId,
    string AppointmentNumber,
    int Rating,
    string Comment,
    ReviewStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
