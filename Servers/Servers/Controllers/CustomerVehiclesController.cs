using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.CustomerVehicles;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/customer-vehicles")]
public sealed class CustomerVehiclesController : ControllerBase
{
    private readonly ICustomerVehicleService _vehicles;

    public CustomerVehiclesController(ICustomerVehicleService vehicles)
    {
        _vehicles = vehicles;
    }

    [HttpGet("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<CustomerVehicleResponse>>> GetMyVehicles(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var vehicles = await _vehicles.GetMyVehiclesAsync(userId, cancellationToken);
        return Ok(vehicles);
    }

    [HttpPost("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<CustomerVehicleResponse>> CreateMyVehicle(
        CreateCustomerVehicleRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var vehicle = await _vehicles.CreateVehicleAsync(userId, request, userId, cancellationToken);
            return CreatedAtAction(nameof(GetMyVehicles), new { }, vehicle);
        }
        catch (CustomerVehicleValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("me/{vehicleId:int}")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<CustomerVehicleResponse>> UpdateMyVehicle(
        int vehicleId,
        UpdateCustomerVehicleRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var vehicle = await _vehicles.UpdateVehicleAsync(vehicleId, request, userId, userId, cancellationToken);
            return vehicle is null ? NotFound(new { message = "Vehicle not found." }) : Ok(vehicle);
        }
        catch (CustomerVehicleValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("me/{vehicleId:int}")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<IActionResult> DeleteMyVehicle(int vehicleId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var deleted = await _vehicles.DeleteVehicleAsync(vehicleId, userId, userId, cancellationToken);
        return deleted ? NoContent() : NotFound(new { message = "Vehicle not found." });
    }

    [HttpGet("customers")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<CustomerVehicleOwnerResponse>>> SearchCustomers(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var customers = await _vehicles.SearchCustomersAsync(query, cancellationToken);
        return Ok(customers);
    }

    [HttpGet("search")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<CustomerVehicleResponse>>> SearchVehicles(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var vehicles = await _vehicles.SearchVehiclesAsync(query, cancellationToken);
        return Ok(vehicles);
    }

    [HttpGet("customer/{customerId:int}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<CustomerVehicleResponse>>> GetCustomerVehicles(
        int customerId,
        CancellationToken cancellationToken)
    {
        try
        {
            var vehicles = await _vehicles.GetCustomerVehiclesAsync(customerId, cancellationToken);
            return Ok(vehicles);
        }
        catch (CustomerVehicleValidationException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }

    [HttpPost("customer/{customerId:int}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<CustomerVehicleResponse>> CreateCustomerVehicle(
        int customerId,
        CreateCustomerVehicleRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var vehicle = await _vehicles.CreateVehicleAsync(customerId, request, userId, cancellationToken);
            return CreatedAtAction(nameof(GetCustomerVehicles), new { customerId }, vehicle);
        }
        catch (CustomerVehicleValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{vehicleId:int}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<CustomerVehicleResponse>> UpdateCustomerVehicle(
        int vehicleId,
        UpdateCustomerVehicleRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var vehicle = await _vehicles.UpdateVehicleAsync(vehicleId, request, userId, null, cancellationToken);
            return vehicle is null ? NotFound(new { message = "Vehicle not found." }) : Ok(vehicle);
        }
        catch (CustomerVehicleValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("{vehicleId:int}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<IActionResult> DeleteCustomerVehicle(int vehicleId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var deleted = await _vehicles.DeleteVehicleAsync(vehicleId, userId, null, cancellationToken);
        return deleted ? NoContent() : NotFound(new { message = "Vehicle not found." });
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdValue, out userId);
    }
}
