namespace Servers.Models;

public sealed class PartDetails
{
    public int PartDetailsId { get; set; }

    public int PartId { get; set; }

    public string Description { get; set; } = string.Empty;

    public string VehicleMake { get; set; } = string.Empty;

    public string VehicleModel { get; set; } = string.Empty;

    public string VehicleYear { get; set; } = string.Empty;

    public string CompatibleEngine { get; set; } = string.Empty;

    public string ShelfLocation { get; set; } = string.Empty;

    public string WarrantyPeriod { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public Part Part { get; set; } = null!;
}
