using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.BookingInvoices;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/booking-invoices")]
public sealed class BookingInvoicesController : ControllerBase
{
    private readonly IBookingInvoiceService _bookingInvoices;

    public BookingInvoicesController(IBookingInvoiceService bookingInvoices)
    {
        _bookingInvoices = bookingInvoices;
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<BookingInvoiceResponse>>> GetInvoices(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var invoices = await _bookingInvoices.GetInvoicesAsync(query, cancellationToken);
        return Ok(invoices);
    }

    [HttpGet("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<BookingInvoiceResponse>>> GetMyInvoices(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var invoices = await _bookingInvoices.GetCustomerInvoicesAsync(userId, cancellationToken);
        return Ok(invoices);
    }

    [HttpGet("{bookingInvoiceId:int}")]
    public async Task<ActionResult<BookingInvoiceResponse>> GetInvoice(
        int bookingInvoiceId,
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

        var invoice = await _bookingInvoices.GetInvoiceAsync(
            bookingInvoiceId,
            requiredCustomerId,
            cancellationToken);

        return invoice is null
            ? NotFound(new { message = "Booking invoice not found." })
            : Ok(invoice);
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<BookingInvoiceResponse>> CreateInvoice(
        CreateBookingInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var invoice = await _bookingInvoices.CreateInvoiceAsync(request, userId, cancellationToken);
            return CreatedAtAction(nameof(GetInvoice), new { bookingInvoiceId = invoice.BookingInvoiceId }, invoice);
        }
        catch (BookingInvoiceValidationException exception)
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
