using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.Admin;
using Servers.Models;

namespace Servers.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.Admin))]
[Route("api/admin/insights")]
public sealed class AdminInsightsController : ControllerBase
{
    private const string ReminderType = "OverdueCreditReminder";

    private readonly AppDbContext _db;

    public AdminInsightsController(AppDbContext db)
    {
        _db = db;
    }

    private sealed record OverdueGroupRow(
        int CustomerId,
        string FullName,
        string Email,
        decimal Total,
        int Count,
        DateTime Oldest,
        DateTime Latest);

    [HttpGet("overdue-credits")]
    public async Task<ActionResult<IReadOnlyCollection<OverdueCreditCustomerResponse>>> GetOverdueCredits(
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 100);

        var now = DateTime.UtcNow;
        var cutoff = now.AddMonths(-1);

        var salesOverdue = await (
                from invoice in _db.SalesInvoices.AsNoTracking()
                join customer in _db.Users.AsNoTracking() on invoice.CustomerId equals customer.Id
                where !invoice.IsCancelled
                      && invoice.CreditAmount > 0
                      && invoice.DueDate.HasValue
                      && invoice.DueDate.Value <= cutoff
                group invoice by new { invoice.CustomerId, customer.FullName, customer.Email }
                into groupRow
                select new OverdueGroupRow(
                    groupRow.Key.CustomerId,
                    groupRow.Key.FullName ?? string.Empty,
                    groupRow.Key.Email ?? string.Empty,
                    groupRow.Sum(current => current.CreditAmount),
                    groupRow.Count(),
                    groupRow.Min(current => current.DueDate)!.Value,
                    groupRow.Max(current => current.DueDate)!.Value)
            )
            .ToArrayAsync(cancellationToken);

        var bookingOverdue = await (
                from invoice in _db.BookingInvoices.AsNoTracking()
                join customer in _db.Users.AsNoTracking() on invoice.CustomerId equals customer.Id
                where !invoice.IsCancelled
                      && invoice.CreditAmount > 0
                      && invoice.DueDate.HasValue
                      && invoice.DueDate.Value <= cutoff
                group invoice by new { invoice.CustomerId, customer.FullName, customer.Email }
                into groupRow
                select new OverdueGroupRow(
                    groupRow.Key.CustomerId,
                    groupRow.Key.FullName ?? string.Empty,
                    groupRow.Key.Email ?? string.Empty,
                    groupRow.Sum(current => current.CreditAmount),
                    groupRow.Count(),
                    groupRow.Min(current => current.DueDate)!.Value,
                    groupRow.Max(current => current.DueDate)!.Value)
            )
            .ToArrayAsync(cancellationToken);

        var reminderRows = await _db.Notifications
            .AsNoTracking()
            .Where(notification => notification.UserId.HasValue && notification.Type == ReminderType)
            .GroupBy(notification => notification.UserId!.Value)
            .Select(group => new
            {
                CustomerId = group.Key,
                LastReminderAt = group.Max(notification => notification.CreatedAt),
            })
            .ToArrayAsync(cancellationToken);

        var reminderLookup = reminderRows.ToDictionary(row => row.CustomerId, row => row.LastReminderAt);

        var merged = new Dictionary<int, OverdueCreditCustomerResponse>();

        void Apply(OverdueGroupRow row, bool isSales)
        {
            var customerId = row.CustomerId;
            var fullName = row.FullName ?? string.Empty;
            var email = row.Email ?? string.Empty;
            var total = row.Total;
            var count = row.Count;
            var oldest = row.Oldest;
            var latest = row.Latest;

            if (!merged.TryGetValue(customerId, out var current))
            {
                merged[customerId] = new OverdueCreditCustomerResponse(
                    customerId,
                    fullName,
                    email,
                    total,
                    isSales ? count : 0,
                    isSales ? 0 : count,
                    oldest,
                    latest,
                    reminderLookup.TryGetValue(customerId, out var lastReminderAt) ? lastReminderAt : null);
                return;
            }

            merged[customerId] = current with
            {
                FullName = string.IsNullOrWhiteSpace(current.FullName) ? fullName : current.FullName,
                Email = string.IsNullOrWhiteSpace(current.Email) ? email : current.Email,
                TotalOverdueAmount = current.TotalOverdueAmount + total,
                SalesInvoiceCount = current.SalesInvoiceCount + (isSales ? count : 0),
                BookingInvoiceCount = current.BookingInvoiceCount + (isSales ? 0 : count),
                OldestDueDate = oldest < current.OldestDueDate ? oldest : current.OldestDueDate,
                LatestDueDate = latest > current.LatestDueDate ? latest : current.LatestDueDate,
            };
        }

        foreach (var row in salesOverdue)
        {
            Apply(row, true);
        }

        foreach (var row in bookingOverdue)
        {
            Apply(row, false);
        }

        var result = merged.Values
            .OrderByDescending(row => row.TotalOverdueAmount)
            .ThenBy(row => row.FullName)
            .Take(take)
            .ToArray();

        return Ok(result);
    }
}
