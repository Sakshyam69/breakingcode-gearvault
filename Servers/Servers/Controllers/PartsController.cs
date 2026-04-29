using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.Parts;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
public sealed class PartsController : ControllerBase
{
    private readonly IPartService _parts;

    public PartsController(IPartService parts)
    {
        _parts = parts;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<PartResponse>>> GetParts(
        CancellationToken cancellationToken)
    {
        var parts = await _parts.GetPartsAsync(cancellationToken);
        return Ok(parts);
    }

    [HttpGet("{partId:int}")]
    public async Task<ActionResult<PartResponse>> GetPart(
        int partId,
        CancellationToken cancellationToken)
    {
        var part = await _parts.GetPartAsync(partId, cancellationToken);
        return part is null ? NotFound(new { message = "Part not found." }) : Ok(part);
    }

    [HttpPost]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<ActionResult<PartResponse>> CreatePart(
        CreatePartRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var part = await _parts.CreatePartAsync(request, userId, cancellationToken);
            return CreatedAtAction(nameof(GetPart), new { partId = part.PartId }, part);
        }
        catch (DuplicatePartNumberException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpPut("{partId:int}")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<ActionResult<PartResponse>> UpdatePart(
        int partId,
        UpdatePartRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var part = await _parts.UpdatePartAsync(partId, request, userId, cancellationToken);
            return part is null ? NotFound(new { message = "Part not found." }) : Ok(part);
        }
        catch (DuplicatePartNumberException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpDelete("{partId:int}")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<IActionResult> DeletePart(int partId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var deleted = await _parts.DeletePartAsync(partId, userId, cancellationToken);
        return deleted ? NoContent() : NotFound(new { message = "Part not found." });
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdValue, out userId);
    }
}
