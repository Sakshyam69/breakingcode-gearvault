using System.ComponentModel.DataAnnotations;

namespace Servers.DTOs.VehicleHealth;

public sealed class AnalyzeVehicleHealthRequest
{
    public bool ForceRefresh { get; set; }
}

public sealed class GetVehicleHealthHistoryRequest
{
    [Range(1, 50)]
    public int Take { get; set; } = 10;
}

public sealed record VehicleHealthPredictionResponse(
    int VehicleHealthPredictionId,
    int CustomerVehicleId,
    string VehicleNumber,
    string VehicleLabel,
    string RiskLevel,
    IReadOnlyCollection<string> PredictedFailures,
    IReadOnlyCollection<string> RecommendedParts,
    string Urgency,
    string Why,
    int? NextCheckMileage,
    DateTime? NextCheckDate,
    string Disclaimer,
    string ModelUsed,
    DateTime GeneratedAt);
