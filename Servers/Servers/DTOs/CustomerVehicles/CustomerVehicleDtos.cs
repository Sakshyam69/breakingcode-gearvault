using System.ComponentModel.DataAnnotations;

namespace Servers.DTOs.CustomerVehicles;

public class CreateCustomerVehicleRequest
{
    [Required]
    [StringLength(40, MinimumLength = 2)]
    public string VehicleNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Make { get; set; } = string.Empty;

    [Required]
    [StringLength(120, MinimumLength = 1)]
    public string Model { get; set; } = string.Empty;

    [StringLength(30)]
    public string Year { get; set; } = string.Empty;

    [StringLength(60)]
    public string Color { get; set; } = string.Empty;

    [StringLength(60)]
    public string FuelType { get; set; } = string.Empty;

    [StringLength(120)]
    public string EngineNumber { get; set; } = string.Empty;

    [StringLength(120)]
    public string ChassisNumber { get; set; } = string.Empty;

    [Range(0, 5000000)]
    public int? Mileage { get; set; }

    public bool IsPrimary { get; set; }

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}

public sealed class UpdateCustomerVehicleRequest : CreateCustomerVehicleRequest
{
    public bool IsActive { get; set; } = true;
}

public sealed record CustomerVehicleResponse(
    int CustomerVehicleId,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string VehicleNumber,
    string Make,
    string Model,
    string Year,
    string Color,
    string FuelType,
    string EngineNumber,
    string ChassisNumber,
    int? Mileage,
    bool IsPrimary,
    bool IsActive,
    int? CreatedByUserId,
    int? UpdatedByUserId,
    string CreatedByUserName,
    string CreatedByUserEmail,
    string CreatedByUserRole,
    string UpdatedByUserName,
    string UpdatedByUserEmail,
    string UpdatedByUserRole,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    string Notes);

public sealed record CustomerVehicleOwnerResponse(
    int CustomerId,
    string FullName,
    string Email,
    string Phone,
    int VehicleCount);
