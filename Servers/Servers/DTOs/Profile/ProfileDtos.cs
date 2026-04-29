using System.ComponentModel.DataAnnotations;

namespace Servers.DTOs.Profile;

public sealed class CompleteProfileSetupRequest
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(250)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string City { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    [Required]
    [StringLength(30)]
    public string Gender { get; set; } = string.Empty;

    [StringLength(500)]
    public string ProfileImageUrl { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string EmergencyContactPhone { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}

public sealed class UpdateProfileRequest
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(250)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string City { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    [Required]
    [StringLength(30)]
    public string Gender { get; set; } = string.Empty;

    [StringLength(500)]
    public string ProfileImageUrl { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string EmergencyContactPhone { get; set; } = string.Empty;
}
