using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.VehicleHealth;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/vehicle-health")]
public sealed class VehicleHealthController : ControllerBase
{
    private readonly IVehicleHealthAiService _vehicleHealthAi;

    public VehicleHealthController(IVehicleHealthAiService vehicleHealthAi)
    {
        _vehicleHealthAi = vehicleHealthAi;
    }

    [HttpPost("vehicles/{vehicleId:int}/analyze")]
    [Authorize(Roles = $"{nameof(UserRole.Customer)},{nameof(UserRole.Staff)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<VehicleHealthPredictionResponse>> AnalyzeVehicle(
        int vehicleId,
        AnalyzeVehicleHealthRequest? request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUser(out var userId, out var role))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var response = await _vehicleHealthAi.AnalyzeAsync(
                vehicleId,
                userId,
                role,
                request?.ForceRefresh ?? false,
                cancellationToken);

            return Ok(response);
        }
        catch (VehicleHealthAiException exception)
        {
            return StatusCode(exception.StatusCode, new { message = exception.Message });
        }
    }

    [HttpGet("vehicles/{vehicleId:int}/latest")]
    [Authorize(Roles = $"{nameof(UserRole.Customer)},{nameof(UserRole.Staff)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<VehicleHealthPredictionResponse>> GetLatestPrediction(
        int vehicleId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUser(out var userId, out var role))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var response = await _vehicleHealthAi.GetLatestAsync(vehicleId, userId, role, cancellationToken);
            return response is null
                ? NotFound(new { message = "No prediction found for this vehicle yet." })
                : Ok(response);
        }
        catch (VehicleHealthAiException exception)
        {
            return StatusCode(exception.StatusCode, new { message = exception.Message });
        }
    }

    [HttpGet("vehicles/{vehicleId:int}/history")]
    [Authorize(Roles = $"{nameof(UserRole.Customer)},{nameof(UserRole.Staff)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<IReadOnlyCollection<VehicleHealthPredictionResponse>>> GetPredictionHistory(
        int vehicleId,
        [FromQuery] GetVehicleHealthHistoryRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUser(out var userId, out var role))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var response = await _vehicleHealthAi.GetHistoryAsync(
                vehicleId,
                userId,
                role,
                request.Take,
                cancellationToken);
            return Ok(response);
        }
        catch (VehicleHealthAiException exception)
        {
            return StatusCode(exception.StatusCode, new { message = exception.Message });
        }
    }

    private bool TryGetUser(out int userId, out UserRole role)
    {
        userId = 0;
        role = default;

        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleValue = User.FindFirstValue(ClaimTypes.Role);

        return int.TryParse(userIdValue, out userId)
            && Enum.TryParse(roleValue, true, out role);
    }
}
