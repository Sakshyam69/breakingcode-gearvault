using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.PartRequests;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/part-requests")]
public sealed class PartRequestsController : ControllerBase
{
    private readonly IPartRequestService _partRequests;

    public PartRequestsController(IPartRequestService partRequests)
    {
        _partRequests = partRequests;
    }

    [HttpGet("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<PartRequestResponse>>> GetMyRequests(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var requests = await _partRequests.GetMyRequestsAsync(userId, cancellationToken);
        return Ok(requests);
    }

    [HttpPost("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<PartRequestResponse>> CreateMyRequest(
        CreatePartRequestRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var partRequest = await _partRequests.CreateRequestAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetMyRequests), new { }, partRequest);
        }
        catch (PartRequestValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("me/{partRequestId:int}/cancel")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<IActionResult> CancelMyRequest(
        int partRequestId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var cancelled = await _partRequests.CancelMyRequestAsync(partRequestId, userId, cancellationToken);
            return cancelled ? NoContent() : NotFound(new { message = "Part request not found." });
        }
        catch (PartRequestValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<PartRequestResponse>>> GetRequests(
        [FromQuery] string? query,
        [FromQuery] PartRequestStatus? status,
        CancellationToken cancellationToken)
    {
        var requests = await _partRequests.GetRequestsAsync(query, status, cancellationToken);
        return Ok(requests);
    }

    [HttpPut("{partRequestId:int}/status")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<PartRequestResponse>> UpdateStatus(
        int partRequestId,
        UpdatePartRequestStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var partRequest = await _partRequests.UpdateStatusAsync(
                partRequestId,
                request,
                userId,
                cancellationToken);

            return partRequest is null
                ? NotFound(new { message = "Part request not found." })
                : Ok(partRequest);
        }
        catch (PartRequestValidationException exception)
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
