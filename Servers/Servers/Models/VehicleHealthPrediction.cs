namespace Servers.Models;

public sealed class VehicleHealthPrediction
{
    public int VehicleHealthPredictionId { get; set; }

    public int CustomerVehicleId { get; set; }

    public CustomerVehicle Vehicle { get; set; } = null!;

    public string RiskLevel { get; set; } = string.Empty;

    public string PredictedFailuresJson { get; set; } = "[]";

    public string RecommendedPartsJson { get; set; } = "[]";

    public string Urgency { get; set; } = string.Empty;

    public string Why { get; set; } = string.Empty;

    public int? NextCheckMileage { get; set; }

    public DateTime? NextCheckDate { get; set; }

    public string Disclaimer { get; set; } = string.Empty;

    public string ModelUsed { get; set; } = string.Empty;

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
