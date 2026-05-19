using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Servers.Configuration;
using Servers.Data;
using Servers.DTOs.VehicleHealth;
using Servers.Models;

namespace Servers.Services;

public interface IVehicleHealthAiService
{
    Task<VehicleHealthPredictionResponse> AnalyzeAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        bool forceRefresh,
        CancellationToken cancellationToken);

    Task<VehicleHealthPredictionResponse?> GetLatestAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<VehicleHealthPredictionResponse>> GetHistoryAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        int take,
        CancellationToken cancellationToken);
}

public sealed class VehicleHealthAiException : Exception
{
    public VehicleHealthAiException(string message, int statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}

public sealed class DeepSeekVehicleHealthAiService : IVehicleHealthAiService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly TimeSpan AnalysisCacheDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan AnalyzeCooldownDuration = TimeSpan.FromSeconds(20);
    private static readonly string[] HighRiskStatuses = ["InProgress", "Pending", "Confirmed"];

    private readonly AppDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DeepSeekVehicleHealthAiService> _logger;
    private readonly DeepSeekOptions _options;

    public DeepSeekVehicleHealthAiService(
        AppDbContext db,
        HttpClient httpClient,
        IMemoryCache cache,
        ILogger<DeepSeekVehicleHealthAiService> logger,
        IOptions<DeepSeekOptions> options)
    {
        _db = db;
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<VehicleHealthPredictionResponse> AnalyzeAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        bool forceRefresh,
        CancellationToken cancellationToken)
    {
        var vehicle = await EnsureVehicleAccessAsync(vehicleId, requesterUserId, requesterRole, cancellationToken);

        if (!forceRefresh &&
            _cache.TryGetValue<VehicleHealthPredictionResponse>(LatestCacheKey(vehicleId), out var cachedResponse)
            && cachedResponse is not null)
        {
            return cachedResponse;
        }

        var latestEntity = await _db.VehicleHealthPredictions
            .AsNoTracking()
            .Where(prediction => prediction.CustomerVehicleId == vehicleId)
            .OrderByDescending(prediction => prediction.GeneratedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (!forceRefresh && latestEntity is not null && latestEntity.GeneratedAt >= DateTime.UtcNow.Subtract(AnalysisCacheDuration))
        {
            var latestResponse = ToResponse(latestEntity, vehicle);
            _cache.Set(LatestCacheKey(vehicleId), latestResponse, AnalysisCacheDuration);
            return latestResponse;
        }

        if (!forceRefresh && _cache.TryGetValue(CooldownCacheKey(vehicleId, requesterUserId), out _))
        {
            if (latestEntity is not null)
            {
                var latestResponse = ToResponse(latestEntity, vehicle);
                _cache.Set(LatestCacheKey(vehicleId), latestResponse, AnalysisCacheDuration);
                return latestResponse;
            }

            throw new VehicleHealthAiException(
                "Please wait a few seconds before running another analysis for this vehicle.",
                StatusCodes.Status429TooManyRequests);
        }

        var context = await BuildContextAsync(vehicle, cancellationToken);

        AiPrediction generatedPrediction;
        try
        {
            generatedPrediction = await GeneratePredictionWithDeepSeekAsync(context, cancellationToken);
        }
        catch (VehicleHealthAiException exception) when (exception.StatusCode is StatusCodes.Status502BadGateway
            or StatusCodes.Status503ServiceUnavailable
            or StatusCodes.Status504GatewayTimeout
            or StatusCodes.Status429TooManyRequests)
        {
            _logger.LogWarning(
                "DeepSeek unavailable for vehicle {VehicleId}; using fallback prediction. Reason: {Reason}",
                vehicle.CustomerVehicleId,
                exception.Message);

            generatedPrediction = BuildFallbackPrediction(context);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "DeepSeek parsing failed for vehicle {VehicleId}; using fallback prediction.",
                vehicle.CustomerVehicleId);

            generatedPrediction = BuildFallbackPrediction(context);
        }

        var entity = new VehicleHealthPrediction
        {
            CustomerVehicleId = vehicle.CustomerVehicleId,
            RiskLevel = NormalizeRiskLevel(generatedPrediction.RiskLevel),
            PredictedFailuresJson = JsonSerializer.Serialize(generatedPrediction.PredictedFailures, JsonOptions),
            RecommendedPartsJson = JsonSerializer.Serialize(generatedPrediction.RecommendedParts, JsonOptions),
            Urgency = NormalizeUrgency(generatedPrediction.Urgency),
            Why = LimitLength(generatedPrediction.Why, 2000),
            NextCheckMileage = generatedPrediction.NextCheckMileage,
            NextCheckDate = generatedPrediction.NextCheckDate?.Date,
            Disclaimer = LimitLength(generatedPrediction.Disclaimer, 1000),
            ModelUsed = LimitLength(generatedPrediction.ModelUsed, 120),
            GeneratedAt = DateTime.UtcNow
        };

        _db.VehicleHealthPredictions.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        var response = ToResponse(entity, vehicle);
        _cache.Set(LatestCacheKey(vehicleId), response, AnalysisCacheDuration);
        _cache.Set(CooldownCacheKey(vehicleId, requesterUserId), true, AnalyzeCooldownDuration);

        return response;
    }

    public async Task<VehicleHealthPredictionResponse?> GetLatestAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        CancellationToken cancellationToken)
    {
        var vehicle = await EnsureVehicleAccessAsync(vehicleId, requesterUserId, requesterRole, cancellationToken);

        var latest = await _db.VehicleHealthPredictions
            .AsNoTracking()
            .Where(prediction => prediction.CustomerVehicleId == vehicleId)
            .OrderByDescending(prediction => prediction.GeneratedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is null)
        {
            return null;
        }

        var response = ToResponse(latest, vehicle);
        _cache.Set(LatestCacheKey(vehicleId), response, AnalysisCacheDuration);
        return response;
    }

    public async Task<IReadOnlyCollection<VehicleHealthPredictionResponse>> GetHistoryAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        int take,
        CancellationToken cancellationToken)
    {
        var vehicle = await EnsureVehicleAccessAsync(vehicleId, requesterUserId, requesterRole, cancellationToken);
        take = Math.Clamp(take, 1, 50);

        var predictions = await _db.VehicleHealthPredictions
            .AsNoTracking()
            .Where(prediction => prediction.CustomerVehicleId == vehicleId)
            .OrderByDescending(prediction => prediction.GeneratedAt)
            .Take(take)
            .ToArrayAsync(cancellationToken);

        return predictions.Select(prediction => ToResponse(prediction, vehicle)).ToArray();
    }

    private async Task<VehicleContext> BuildContextAsync(CustomerVehicle vehicle, CancellationToken cancellationToken)
    {
        var recentServices = await _db.ServiceAppointments
            .AsNoTracking()
            .Where(appointment => appointment.VehicleId == vehicle.CustomerVehicleId)
            .OrderByDescending(appointment => appointment.CreatedAt)
            .Take(8)
            .Select(appointment => new ServiceSignal(
                appointment.CreatedAt,
                appointment.CompletedAt,
                appointment.Status.ToString(),
                appointment.Urgency.ToString(),
                appointment.MileageAtBooking,
                LimitLength(appointment.ProblemDescription, 220),
                LimitLength(appointment.DiagnosisNote, 220),
                LimitLength(appointment.CompletionNote, 220)))
            .ToArrayAsync(cancellationToken);

        var recentPartRequests = await _db.PartRequests
            .AsNoTracking()
            .Where(request => request.VehicleId == vehicle.CustomerVehicleId)
            .OrderByDescending(request => request.CreatedAt)
            .Take(8)
            .Select(request => new PartRequestSignal(
                request.PartRequestId,
                request.CreatedAt,
                request.Status.ToString(),
                request.Urgency.ToString(),
                LimitLength(request.PartName, 140),
                LimitLength(request.PartNumber, 100),
                request.Quantity,
                LimitLength(request.Description, 220)))
            .ToArrayAsync(cancellationToken);

        var partRequestIds = recentPartRequests.Select(request => request.PartRequestId).ToArray();

        var purchasedParts = partRequestIds.Length == 0
            ? []
            : await (
                from invoice in _db.SalesInvoices.AsNoTracking()
                join item in _db.SalesInvoiceItems.AsNoTracking() on invoice.SalesInvoiceId equals item.SalesInvoiceId
                where invoice.SourcePartRequestId.HasValue && partRequestIds.Contains(invoice.SourcePartRequestId.Value)
                orderby invoice.InvoiceDate descending
                select new PurchasedPartSignal(
                    LimitLength(item.PartName, 140),
                    LimitLength(item.PartNumber, 100),
                    item.Quantity,
                    item.UnitPrice))
            .Take(10)
            .ToArrayAsync(cancellationToken);

        var recentServiceInvoices = await (
                from invoice in _db.BookingInvoices.AsNoTracking()
                join appointment in _db.ServiceAppointments.AsNoTracking()
                    on invoice.ServiceAppointmentId equals appointment.ServiceAppointmentId
                where appointment.VehicleId == vehicle.CustomerVehicleId
                orderby invoice.InvoiceDate descending
                select new ServiceInvoiceSignal(
                    invoice.InvoiceNumber,
                    invoice.InvoiceDate,
                    invoice.TotalAmount,
                    invoice.CreditAmount,
                    invoice.PaymentStatus.ToString()))
            .Take(6)
            .ToArrayAsync(cancellationToken);

        return new VehicleContext(
            vehicle.CustomerVehicleId,
            vehicle.CustomerId,
            vehicle.Customer.FullName,
            vehicle.VehicleNumber,
            vehicle.Make,
            vehicle.Model,
            vehicle.Year,
            vehicle.FuelType,
            vehicle.Mileage,
            recentServices,
            recentPartRequests,
            purchasedParts,
            recentServiceInvoices);
    }

    private async Task<CustomerVehicle> EnsureVehicleAccessAsync(
        int vehicleId,
        int requesterUserId,
        UserRole requesterRole,
        CancellationToken cancellationToken)
    {
        if (vehicleId <= 0)
        {
            throw new VehicleHealthAiException("Vehicle id must be greater than zero.", StatusCodes.Status400BadRequest);
        }

        var vehicle = await _db.CustomerVehicles
            .AsNoTracking()
            .Include(current => current.Customer)
            .FirstOrDefaultAsync(
                current => current.CustomerVehicleId == vehicleId && current.IsActive,
                cancellationToken);

        if (vehicle is null)
        {
            throw new VehicleHealthAiException("Vehicle not found.", StatusCodes.Status404NotFound);
        }

        if (requesterRole == UserRole.Customer && vehicle.CustomerId != requesterUserId)
        {
            throw new VehicleHealthAiException("Vehicle not found.", StatusCodes.Status404NotFound);
        }

        return vehicle;
    }

    private async Task<AiPrediction> GeneratePredictionWithDeepSeekAsync(
        VehicleContext context,
        CancellationToken cancellationToken)
    {
        EnsureDeepSeekConfigured();

        var endpoint = BuildChatEndpoint(_options.BaseUrl);
        var model = string.IsNullOrWhiteSpace(_options.Model) ? "deepseek-v4-flash" : _options.Model.Trim();
        var contextJson = JsonSerializer.Serialize(new
        {
            vehicle = new
            {
                context.VehicleId,
                context.CustomerId,
                context.CustomerName,
                context.VehicleNumber,
                context.Make,
                context.Model,
                context.Year,
                context.FuelType,
                context.CurrentMileage
            },
            recentServices = context.RecentServices,
            recentPartRequests = context.RecentPartRequests,
            recentPurchasedParts = context.RecentPurchasedParts,
            recentServiceInvoices = context.RecentServiceInvoices
        }, JsonOptions);

        var systemPrompt = """
            You are a vehicle maintenance risk analyst for a vehicle service center.
            Return ONLY valid JSON (no markdown, no code fences, no extra commentary).
            Use this exact schema:
            {
              "riskLevel": "low|medium|high|critical",
              "predictedFailures": ["string"],
              "recommendedParts": ["string"],
              "urgency": "low|normal|high|urgent",
              "why": "short plain explanation",
              "nextCheckMileage": 12345 or null,
              "nextCheckDate": "YYYY-MM-DD" or null,
              "disclaimer": "short disclaimer"
            }
            Rules:
            - Keep arrays concise (max 6 items each).
            - Never return extra keys.
            - Be conservative when uncertain.
            """;

        var userPrompt = $"""
            Current UTC date: {DateTime.UtcNow:yyyy-MM-dd}
            Analyze this context JSON and return schema JSON only:
            {contextJson}
            """;

        var payload = JsonSerializer.Serialize(new
        {
            model,
            temperature = 0.2,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            }
        }, JsonOptions);

        string responseBody = string.Empty;
        HttpStatusCode statusCode = HttpStatusCode.BadGateway;

        for (var attempt = 1; attempt <= 2; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey.Trim());
            request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

            try
            {
                using var response = await _httpClient.SendAsync(request, cancellationToken);
                responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                statusCode = response.StatusCode;

                if (response.IsSuccessStatusCode)
                {
                    break;
                }

                var isRetryable = response.StatusCode == HttpStatusCode.TooManyRequests
                    || (int)response.StatusCode >= 500;
                if (attempt < 2 && isRetryable)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(350 * attempt), cancellationToken);
                    continue;
                }

                throw new VehicleHealthAiException(
                    $"DeepSeek request failed with status {(int)response.StatusCode}.",
                    MapStatusCode(response.StatusCode));
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested && attempt < 2)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(350 * attempt), cancellationToken);
            }
            catch (HttpRequestException) when (attempt < 2)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(350 * attempt), cancellationToken);
            }
        }

        if (string.IsNullOrWhiteSpace(responseBody))
        {
            throw new VehicleHealthAiException("DeepSeek returned an empty response.", StatusCodes.Status502BadGateway);
        }

        using var responseDocument = JsonDocument.Parse(responseBody);
        var aiContent = ExtractMessageContent(responseDocument.RootElement);
        var aiJson = SanitizeJson(aiContent);

        using var predictionDocument = JsonDocument.Parse(aiJson);
        var root = predictionDocument.RootElement;

        var predictedFailures = ReadStringArray(root, "predictedFailures");
        var recommendedParts = ReadStringArray(root, "recommendedParts");
        var riskLevel = NormalizeRiskLevel(ReadString(root, "riskLevel", "medium"));
        var urgency = NormalizeUrgency(ReadString(root, "urgency", "normal"));
        var why = LimitLength(ReadString(root, "why", "No clear risk reason was provided."), 2000);
        var disclaimer = LimitLength(
            ReadString(
                root,
                "disclaimer",
                "AI suggestions are supportive guidance only. Confirm with a technician."),
            1000);

        var nextCheckMileage = ReadNullableInt(root, "nextCheckMileage");
        var nextCheckDate = ReadNullableDate(root, "nextCheckDate");

        return new AiPrediction(
            riskLevel,
            predictedFailures,
            recommendedParts,
            urgency,
            why,
            nextCheckMileage,
            nextCheckDate,
            disclaimer,
            model);
    }

    private AiPrediction BuildFallbackPrediction(VehicleContext context)
    {
        var now = DateTime.UtcNow;
        var mileage = context.CurrentMileage ?? 0;
        var hasUrgentOpenService = context.RecentServices.Any(service =>
            HighRiskStatuses.Contains(service.Status, StringComparer.OrdinalIgnoreCase)
            && (service.Urgency.Equals("Urgent", StringComparison.OrdinalIgnoreCase)
                || service.Urgency.Equals("High", StringComparison.OrdinalIgnoreCase)));
        var hasManyRequests = context.RecentPartRequests.Length >= 4;

        var riskLevel = "low";
        var urgency = "normal";

        if (mileage >= 120_000 || hasUrgentOpenService)
        {
            riskLevel = "high";
            urgency = "high";
        }
        else if (mileage >= 80_000 || hasManyRequests)
        {
            riskLevel = "medium";
            urgency = "normal";
        }

        var predictedFailures = mileage >= 100_000
            ? new[] { "Brake pads wear", "Suspension wear", "Battery weakness", "Filter clogging" }
            : new[] { "Engine oil quality drop", "Air filter clogging", "Brake fluid aging" };

        var recommendedParts = mileage >= 100_000
            ? new[] { "Brake pad set", "Suspension bushings", "Battery", "Engine oil + oil filter" }
            : new[] { "Engine oil", "Oil filter", "Air filter", "Brake fluid" };

        var why = hasUrgentOpenService
            ? "Recent high-urgency service history suggests elevated near-term part failure risk."
            : mileage > 0
                ? $"Vehicle mileage ({mileage:n0} km) and recent maintenance history indicate likely preventive replacements."
                : "Limited usage data available, so a conservative preventive estimate was generated.";
        int? nextCheckMileage = context.CurrentMileage.HasValue
            ? context.CurrentMileage.Value + (riskLevel == "high" ? 1500 : 3000)
            : null;

        var nextCheckDate = riskLevel == "high"
            ? now.AddDays(30).Date
            : now.AddDays(90).Date;

        return new AiPrediction(
            riskLevel,
            predictedFailures,
            recommendedParts,
            urgency,
            why,
            nextCheckMileage,
            nextCheckDate,
            "AI provider was unavailable, so a rule-based fallback prediction is shown. Confirm with a technician.",
            "rule-based-fallback");
    }

    private static VehicleHealthPredictionResponse ToResponse(
        VehicleHealthPrediction prediction,
        CustomerVehicle vehicle)
    {
        return new VehicleHealthPredictionResponse(
            prediction.VehicleHealthPredictionId,
            prediction.CustomerVehicleId,
            vehicle.VehicleNumber,
            $"{vehicle.Make} {vehicle.Model}".Trim(),
            NormalizeRiskLevel(prediction.RiskLevel),
            DeserializeStringArray(prediction.PredictedFailuresJson),
            DeserializeStringArray(prediction.RecommendedPartsJson),
            NormalizeUrgency(prediction.Urgency),
            prediction.Why,
            prediction.NextCheckMileage,
            prediction.NextCheckDate,
            prediction.Disclaimer,
            prediction.ModelUsed,
            prediction.GeneratedAt);
    }

    private static IReadOnlyCollection<string> DeserializeStringArray(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return Array.Empty<string>();
        }

        try
        {
            var deserialized = JsonSerializer.Deserialize<string[]>(value, JsonOptions) ?? [];
            return deserialized
                .Select(item => item?.Trim() ?? string.Empty)
                .Where(item => item.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(6)
                .ToArray();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static string[] ReadStringArray(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return [];
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            var single = value.GetString()?.Trim();
            return string.IsNullOrWhiteSpace(single) ? [] : [single];
        }

        if (value.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var result = new List<string>();
        foreach (var item in value.EnumerateArray())
        {
            switch (item.ValueKind)
            {
                case JsonValueKind.String:
                {
                    var text = item.GetString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        result.Add(text);
                    }

                    break;
                }
                case JsonValueKind.Object:
                {
                    var candidate = ReadAnyString(item, "name")
                        ?? ReadAnyString(item, "part")
                        ?? ReadAnyString(item, "title")
                        ?? ReadAnyString(item, "item");
                    if (!string.IsNullOrWhiteSpace(candidate))
                    {
                        result.Add(candidate.Trim());
                    }

                    break;
                }
            }
        }

        return result
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToArray();
    }

    private static string? ReadAnyString(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        return value.GetString();
    }

    private static string ReadString(JsonElement root, string propertyName, string fallback)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return fallback;
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            var text = value.GetString()?.Trim();
            return string.IsNullOrWhiteSpace(text) ? fallback : text;
        }

        return fallback;
    }

    private static int? ReadNullableInt(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var numericValue))
        {
            return numericValue;
        }

        if (value.ValueKind == JsonValueKind.String &&
            int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedValue))
        {
            return parsedValue;
        }

        return null;
    }

    private static DateTime? ReadNullableDate(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var value))
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.String &&
            DateTime.TryParse(
                value.GetString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed))
        {
            return parsed.Date;
        }

        return null;
    }

    private static string ExtractMessageContent(JsonElement responseRoot)
    {
        if (!responseRoot.TryGetProperty("choices", out var choices)
            || choices.ValueKind != JsonValueKind.Array
            || choices.GetArrayLength() == 0)
        {
            throw new VehicleHealthAiException("DeepSeek returned no choices.", StatusCodes.Status502BadGateway);
        }

        var firstChoice = choices[0];
        if (!firstChoice.TryGetProperty("message", out var message))
        {
            throw new VehicleHealthAiException("DeepSeek returned no message payload.", StatusCodes.Status502BadGateway);
        }

        if (!message.TryGetProperty("content", out var content))
        {
            throw new VehicleHealthAiException("DeepSeek returned no content payload.", StatusCodes.Status502BadGateway);
        }

        return content.ValueKind switch
        {
            JsonValueKind.String => content.GetString() ?? string.Empty,
            JsonValueKind.Array => string.Join(
                "\n",
                content.EnumerateArray().Select(item =>
                {
                    if (item.ValueKind == JsonValueKind.String)
                    {
                        return item.GetString() ?? string.Empty;
                    }

                    if (item.ValueKind == JsonValueKind.Object
                        && item.TryGetProperty("text", out var textNode)
                        && textNode.ValueKind == JsonValueKind.String)
                    {
                        return textNode.GetString() ?? string.Empty;
                    }

                    return string.Empty;
                })),
            _ => string.Empty
        };
    }

    private static string SanitizeJson(string value)
    {
        var text = value.Trim();
        if (text.StartsWith("```", StringComparison.Ordinal))
        {
            var firstLineBreak = text.IndexOf('\n');
            if (firstLineBreak >= 0)
            {
                text = text[(firstLineBreak + 1)..];
            }

            var lastFence = text.LastIndexOf("```", StringComparison.Ordinal);
            if (lastFence >= 0)
            {
                text = text[..lastFence];
            }
        }

        var firstBrace = text.IndexOf('{');
        var lastBrace = text.LastIndexOf('}');
        if (firstBrace >= 0 && lastBrace >= firstBrace)
        {
            text = text[firstBrace..(lastBrace + 1)];
        }

        return text.Trim();
    }

    private static int MapStatusCode(HttpStatusCode statusCode)
    {
        return statusCode switch
        {
            HttpStatusCode.TooManyRequests => StatusCodes.Status429TooManyRequests,
            HttpStatusCode.Unauthorized => StatusCodes.Status503ServiceUnavailable,
            HttpStatusCode.Forbidden => StatusCodes.Status503ServiceUnavailable,
            HttpStatusCode.RequestTimeout => StatusCodes.Status504GatewayTimeout,
            _ when (int)statusCode >= 500 => StatusCodes.Status502BadGateway,
            _ => StatusCodes.Status502BadGateway
        };
    }

    private void EnsureDeepSeekConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new VehicleHealthAiException(
                "DeepSeek is not configured. Set DeepSeek_ApiKey in Servers/Servers/.env.",
                StatusCodes.Status503ServiceUnavailable);
        }
    }

    private static string NormalizeRiskLevel(string value)
    {
        return value.Trim().ToLowerInvariant() switch
        {
            "critical" => "critical",
            "high" => "high",
            "medium" => "medium",
            "low" => "low",
            _ => "medium"
        };
    }

    private static string NormalizeUrgency(string value)
    {
        return value.Trim().ToLowerInvariant() switch
        {
            "urgent" => "urgent",
            "high" => "high",
            "normal" => "normal",
            "low" => "low",
            _ => "normal"
        };
    }

    private static string LimitLength(string value, int maxLength)
    {
        var text = value?.Trim() ?? string.Empty;
        if (text.Length <= maxLength)
        {
            return text;
        }

        return text[..maxLength];
    }

    private static string BuildChatEndpoint(string baseUrl)
    {
        var trimmed = string.IsNullOrWhiteSpace(baseUrl)
            ? "https://api.deepseek.com/v1"
            : baseUrl.Trim().TrimEnd('/');

        if (trimmed.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        if (trimmed.EndsWith("/v1", StringComparison.OrdinalIgnoreCase))
        {
            return $"{trimmed}/chat/completions";
        }

        return $"{trimmed}/v1/chat/completions";
    }

    private static string LatestCacheKey(int vehicleId) => $"vehicle-health:latest:{vehicleId}";

    private static string CooldownCacheKey(int vehicleId, int requesterUserId) =>
        $"vehicle-health:cooldown:{vehicleId}:{requesterUserId}";

    private sealed record VehicleContext(
        int VehicleId,
        int CustomerId,
        string CustomerName,
        string VehicleNumber,
        string Make,
        string Model,
        string Year,
        string FuelType,
        int? CurrentMileage,
        ServiceSignal[] RecentServices,
        PartRequestSignal[] RecentPartRequests,
        PurchasedPartSignal[] RecentPurchasedParts,
        ServiceInvoiceSignal[] RecentServiceInvoices);

    private sealed record ServiceSignal(
        DateTime CreatedAt,
        DateTime? CompletedAt,
        string Status,
        string Urgency,
        int? MileageAtBooking,
        string ProblemDescription,
        string DiagnosisNote,
        string CompletionNote);

    private sealed record PartRequestSignal(
        int PartRequestId,
        DateTime CreatedAt,
        string Status,
        string Urgency,
        string PartName,
        string PartNumber,
        int Quantity,
        string Description);

    private sealed record PurchasedPartSignal(
        string PartName,
        string PartNumber,
        int Quantity,
        decimal UnitPrice);

    private sealed record ServiceInvoiceSignal(
        string InvoiceNumber,
        DateTime InvoiceDate,
        decimal TotalAmount,
        decimal CreditAmount,
        string PaymentStatus);

    private sealed record AiPrediction(
        string RiskLevel,
        string[] PredictedFailures,
        string[] RecommendedParts,
        string Urgency,
        string Why,
        int? NextCheckMileage,
        DateTime? NextCheckDate,
        string Disclaimer,
        string ModelUsed);
}
