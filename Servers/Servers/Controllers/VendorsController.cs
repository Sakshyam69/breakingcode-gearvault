using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.Vendors;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
public sealed class VendorsController : ControllerBase
{
    private readonly IVendorService _vendors;

    public VendorsController(IVendorService vendors)
    {
        _vendors = vendors;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<VendorResponse>>> GetVendors(
        CancellationToken cancellationToken)
    {
        var vendors = await _vendors.GetVendorsAsync(cancellationToken);
        return Ok(vendors);
    }

    [HttpGet("{vendorId:int}")]
    public async Task<ActionResult<VendorResponse>> GetVendor(
        int vendorId,
        CancellationToken cancellationToken)
    {
        var vendor = await _vendors.GetVendorAsync(vendorId, cancellationToken);
        return vendor is null ? NotFound(new { message = "Vendor not found." }) : Ok(vendor);
    }

    [HttpPost]
    public async Task<ActionResult<VendorResponse>> CreateVendor(
        CreateVendorRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var vendor = await _vendors.CreateVendorAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetVendor), new { vendorId = vendor.VendorId }, vendor);
    }

    [HttpPut("{vendorId:int}")]
    public async Task<ActionResult<VendorResponse>> UpdateVendor(
        int vendorId,
        UpdateVendorRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var vendor = await _vendors.UpdateVendorAsync(vendorId, request, userId, cancellationToken);
        return vendor is null ? NotFound(new { message = "Vendor not found." }) : Ok(vendor);
    }

    [HttpDelete("{vendorId:int}")]
    public async Task<IActionResult> DeleteVendor(int vendorId, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var deleted = await _vendors.DeleteVendorAsync(vendorId, userId, cancellationToken);
        return deleted ? NoContent() : NotFound(new { message = "Vendor not found." });
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdValue, out userId);
    }
}
