using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.ServiceAppointments;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/service-appointments")]
public sealed class ServiceAppointmentsController : ControllerBase
{
    private readonly IServiceAppointmentService _appointments;

    public ServiceAppointmentsController(IServiceAppointmentService appointments)
    {
        _appointments = appointments;
    }

    [HttpGet("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<ServiceAppointmentResponse>>> GetMyAppointments(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var appointments = await _appointments.GetMyAppointmentsAsync(userId, cancellationToken);
        return Ok(appointments);
    }

    [HttpPost("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<ServiceAppointmentResponse>> CreateMyAppointment(
        CreateServiceAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var appointment = await _appointments.CreateAppointmentAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetAppointment), new { serviceAppointmentId = appointment.ServiceAppointmentId }, appointment);
        }
        catch (ServiceAppointmentValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("me/{serviceAppointmentId:int}/cancel")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<IActionResult> CancelMyAppointment(
        int serviceAppointmentId,
        CancelServiceAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var cancelled = await _appointments.CancelMyAppointmentAsync(
                serviceAppointmentId,
                userId,
                request,
                cancellationToken);

            return cancelled ? NoContent() : NotFound(new { message = "Service appointment not found." });
        }
        catch (ServiceAppointmentValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<ServiceAppointmentResponse>>> GetAppointments(
        [FromQuery] string? query,
        [FromQuery] ServiceAppointmentStatus? status,
        [FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        var appointments = await _appointments.GetAppointmentsAsync(query, status, date, cancellationToken);
        return Ok(appointments);
    }

    [HttpGet("{serviceAppointmentId:int}")]
    public async Task<ActionResult<ServiceAppointmentResponse>> GetAppointment(
        int serviceAppointmentId,
        CancellationToken cancellationToken)
    {
        int? requiredCustomerId = null;
        if (User.IsInRole(nameof(UserRole.Customer)))
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid token subject." });
            }

            requiredCustomerId = userId;
        }

        var appointment = await _appointments.GetAppointmentAsync(
            serviceAppointmentId,
            requiredCustomerId,
            cancellationToken);

        return appointment is null
            ? NotFound(new { message = "Service appointment not found." })
            : Ok(appointment);
    }

    [HttpPut("{serviceAppointmentId:int}/status")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<ServiceAppointmentResponse>> UpdateStatus(
        int serviceAppointmentId,
        UpdateServiceAppointmentStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var appointment = await _appointments.UpdateStatusAsync(
                serviceAppointmentId,
                request,
                userId,
                cancellationToken);

            return appointment is null
                ? NotFound(new { message = "Service appointment not found." })
                : Ok(appointment);
        }
        catch (ServiceAppointmentValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdValue, out userId);
    }
}
