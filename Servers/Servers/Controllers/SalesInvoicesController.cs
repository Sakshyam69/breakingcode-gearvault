using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.SalesInvoices;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/sales-invoices")]
public sealed class SalesInvoicesController : ControllerBase
{
    private readonly ISalesInvoiceService _salesInvoices;

    public SalesInvoicesController(ISalesInvoiceService salesInvoices)
    {
        _salesInvoices = salesInvoices;
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceResponse>>> GetInvoices(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var invoices = await _salesInvoices.GetInvoicesAsync(query, cancellationToken);
        return Ok(invoices);
    }

    [HttpGet("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<SalesInvoiceResponse>>> GetMyInvoices(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var invoices = await _salesInvoices.GetCustomerInvoicesAsync(userId, cancellationToken);
        return Ok(invoices);
    }

    [HttpGet("{salesInvoiceId:int}")]
    public async Task<ActionResult<SalesInvoiceResponse>> GetInvoice(
        int salesInvoiceId,
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

        var invoice = await _salesInvoices.GetInvoiceAsync(salesInvoiceId, requiredCustomerId, cancellationToken);
        return invoice is null ? NotFound(new { message = "Sales invoice not found." }) : Ok(invoice);
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<SalesInvoiceResponse>> CreateInvoice(
        CreateSalesInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var invoice = await _salesInvoices.CreateInvoiceAsync(request, userId, cancellationToken);
            return CreatedAtAction(nameof(GetInvoice), new { salesInvoiceId = invoice.SalesInvoiceId }, invoice);
        }
        catch (SalesInvoiceValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("from-part-request/{partRequestId:int}")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<SalesInvoiceResponse>> CreateFromPartRequest(
        int partRequestId,
        CreateSalesInvoiceFromPartRequestRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var invoice = await _salesInvoices.CreateFromPartRequestAsync(
                partRequestId,
                request,
                userId,
                cancellationToken);

            return CreatedAtAction(nameof(GetInvoice), new { salesInvoiceId = invoice.SalesInvoiceId }, invoice);
        }
        catch (SalesInvoiceValidationException exception)
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
