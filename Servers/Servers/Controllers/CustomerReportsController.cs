using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.CustomerReports;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/customer-reports")]
public sealed class CustomerReportsController : ControllerBase
{
    private readonly ICustomerReportService _reports;

    public CustomerReportsController(ICustomerReportService reports)
    {
        _reports = reports;
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<CustomerReportsResponse>> GetReports(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] CustomerReportType reportType = CustomerReportType.Combined,
        [FromQuery] string? query = null,
        CancellationToken cancellationToken = default)
    {
        var report = await _reports.GetReportsAsync(from, to, reportType, query, cancellationToken);
        return Ok(report);
    }

    [HttpGet("requests")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<CustomerReportRequestResponse>>> GetRequests(
        [FromQuery] CustomerReportRequestStatus? status,
        CancellationToken cancellationToken)
    {
        var requests = await _reports.GetRequestsAsync(status, cancellationToken);
        return Ok(requests);
    }

    [HttpPut("requests/{requestId:int}/complete")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<CustomerReportRequestResponse>> CompleteRequest(
        int requestId,
        CompleteCustomerReportRequestRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var staffId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var completed = await _reports.CompleteRequestAsync(requestId, staffId, request, cancellationToken);
        return completed is null
            ? NotFound(new { message = "Report request not found." })
            : Ok(completed);
    }

    [HttpGet("requests/me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<CustomerReportRequestResponse>>> GetMyRequests(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var customerId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var requests = await _reports.GetMyRequestsAsync(customerId, cancellationToken);
        return Ok(requests);
    }

    [HttpPost("requests/me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<CustomerReportRequestResponse>> CreateMyRequest(
        CreateCustomerReportRequestRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var customerId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var reportRequest = await _reports.CreateRequestAsync(customerId, request, cancellationToken);
            return CreatedAtAction(nameof(GetMyRequests), new { }, reportRequest);
        }
        catch (CustomerReportValidationException exception)
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
