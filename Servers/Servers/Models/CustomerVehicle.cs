namespace Servers.Models;

public sealed class CustomerVehicle
{
    public int CustomerVehicleId { get; set; }

    public int CustomerId { get; set; }

    public string VehicleNumber { get; set; } = string.Empty;

    public string Make { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string Year { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;

    public string FuelType { get; set; } = string.Empty;

    public string EngineNumber { get; set; } = string.Empty;

    public string ChassisNumber { get; set; } = string.Empty;

    public int? Mileage { get; set; }

    public bool IsPrimary { get; set; }

    public bool IsActive { get; set; } = true;

    public int? CreatedByUserId { get; set; }

    public int? UpdatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public string Notes { get; set; } = string.Empty;

    public User Customer { get; set; } = null!;

    public User? CreatedByUser { get; set; }

    public User? UpdatedByUser { get; set; }
}
