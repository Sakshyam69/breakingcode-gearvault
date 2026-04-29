using System.ComponentModel.DataAnnotations;

namespace Servers.DTOs.Parts;

public class CreatePartRequest
{
    [Required]
    [StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string PartNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Brand { get; set; } = string.Empty;

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Category { get; set; } = string.Empty;

    [Range(0, 999999999)]
    public decimal SellingPrice { get; set; }

    [Range(0, 1000000)]
    public int QuantityInStock { get; set; }

    [Range(0, 1000000)]
    public int ReorderLevel { get; set; } = 10;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    [StringLength(120)]
    public string VehicleMake { get; set; } = string.Empty;

    [StringLength(120)]
    public string VehicleModel { get; set; } = string.Empty;

    [StringLength(30)]
    public string VehicleYear { get; set; } = string.Empty;

    [StringLength(120)]
    public string CompatibleEngine { get; set; } = string.Empty;

    [StringLength(120)]
    public string ShelfLocation { get; set; } = string.Empty;

    [StringLength(80)]
    public string WarrantyPeriod { get; set; } = string.Empty;

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}

public sealed class UpdatePartRequest : CreatePartRequest
{
    public bool IsActive { get; set; } = true;
}

public sealed record PartResponse(
    int PartId,
    string Name,
    string PartNumber,
    string Brand,
    string Category,
    decimal SellingPrice,
    int QuantityInStock,
    int ReorderLevel,
    bool IsLowStock,
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
    PartDetailsResponse Details);

public sealed record PartDetailsResponse(
    int PartDetailsId,
    string Description,
    string VehicleMake,
    string VehicleModel,
    string VehicleYear,
    string CompatibleEngine,
    string ShelfLocation,
    string WarrantyPeriod,
    string Notes);
