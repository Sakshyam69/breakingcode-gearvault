using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.PurchaseInvoices;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Route("api/purchase-invoices")]
[Authorize(Roles = nameof(UserRole.Admin))]
public sealed class PurchaseInvoicesController : ControllerBase
{
    private readonly IPurchaseInvoiceService _purchaseInvoices;

    public PurchaseInvoicesController(IPurchaseInvoiceService purchaseInvoices)
    {
        _purchaseInvoices = purchaseInvoices;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<PurchaseInvoiceResponse>>> GetPurchaseInvoices(
        CancellationToken cancellationToken)
    {
        var invoices = await _purchaseInvoices.GetPurchaseInvoicesAsync(cancellationToken);
        return Ok(invoices);
    }

    [HttpGet("{purchaseInvoiceId:int}")]
    public async Task<ActionResult<PurchaseInvoiceResponse>> GetPurchaseInvoice(
        int purchaseInvoiceId,
        CancellationToken cancellationToken)
    {
        var invoice = await _purchaseInvoices.GetPurchaseInvoiceAsync(purchaseInvoiceId, cancellationToken);
        return invoice is null ? NotFound(new { message = "Purchase invoice not found." }) : Ok(invoice);
    }

    [HttpPost]
    public async Task<ActionResult<PurchaseInvoiceResponse>> CreatePurchaseInvoice(
        CreatePurchaseInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var invoice = await _purchaseInvoices.CreatePurchaseInvoiceAsync(request, userId, cancellationToken);
            return CreatedAtAction(
                nameof(GetPurchaseInvoice),
                new { purchaseInvoiceId = invoice.PurchaseInvoiceId },
                invoice);
        }
        catch (PurchaseInvoiceValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{purchaseInvoiceId:int}")]
    public async Task<ActionResult<PurchaseInvoiceResponse>> UpdatePurchaseInvoice(
        int purchaseInvoiceId,
        UpdatePurchaseInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var invoice = await _purchaseInvoices.UpdatePurchaseInvoiceAsync(
                purchaseInvoiceId,
                request,
                userId,
                cancellationToken);

            return invoice is null ? NotFound(new { message = "Purchase invoice not found." }) : Ok(invoice);
        }
        catch (PurchaseInvoiceValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("{purchaseInvoiceId:int}")]
    public async Task<IActionResult> CancelPurchaseInvoice(
        int purchaseInvoiceId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var cancelled = await _purchaseInvoices.CancelPurchaseInvoiceAsync(
                purchaseInvoiceId,
                userId,
                cancellationToken);

            return cancelled ? NoContent() : NotFound(new { message = "Purchase invoice not found." });
        }
        catch (PurchaseInvoiceValidationException exception)
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
