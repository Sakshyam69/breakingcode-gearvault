using System.ComponentModel.DataAnnotations;
using Servers.DTOs.CustomerVehicles;
using Servers.Models;

namespace Servers.DTOs.Auth;

public sealed class RegisterCustomerRequest
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(180)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public sealed class CreateStaffRequest
{
    [Required]
    [EmailAddress]
    [StringLength(180)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public sealed class CreateCustomerByStaffRequest
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(180)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public CreateCustomerVehicleRequest Vehicle { get; set; } = new();
}

public sealed class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public sealed record UserResponse(
    int Id,
    string FullName,
    string Email,
    string Phone,
    UserRole Role,
    AccountSetupStatus AccountSetupStatus,
    UserProfileResponse? Profile,
    DateTime CreatedAt);

public sealed record UserProfileResponse(
    string Address,
    string City,
    DateTime? DateOfBirth,
    string Gender,
    string ProfileImageUrl,
    string EmergencyContactPhone,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record AuthResponse(
    string Token,
    DateTime ExpiresAt,
    UserResponse User,
    bool CredentialEmailSent = false);

public sealed record StaffCreatedCustomerResponse(
    UserResponse Customer,
    CustomerVehicleResponse Vehicle,
    bool CredentialEmailSent);
