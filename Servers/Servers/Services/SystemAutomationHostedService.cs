using System.Text;
using System.Text.Encodings.Web;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Servers.Configuration;
using Servers.Data;
using Servers.Models;

namespace Servers.Services;

public sealed class SystemAutomationHostedService : BackgroundService
{
    private const int LowStockThreshold = 10;
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(6);
    private static readonly TimeSpan LowStockNotificationCooldown = TimeSpan.FromHours(12);
    private static readonly TimeSpan CreditReminderCooldown = TimeSpan.FromDays(7);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly BrevoEmailOptions _emailOptions;
    private readonly ILogger<SystemAutomationHostedService> _logger;

    public SystemAutomationHostedService(
        IServiceScopeFactory scopeFactory,
        IOptions<BrevoEmailOptions> emailOptions,
        ILogger<SystemAutomationHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(RunInterval);

        // Run once at startup so the system starts producing alerts without waiting for the first interval tick.
        await RunOnceAsync(stoppingToken);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunOnceAsync(stoppingToken);
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
            var email = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var now = DateTime.UtcNow;

            await NotifyLowStockAsync(db, notifications, now, cancellationToken);
            await SendOverdueCreditRemindersAsync(db, notifications, email, now, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "System automation job failed.");
        }
    }

    private static async Task NotifyLowStockAsync(
        AppDbContext db,
        INotificationService notifications,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var lowStockParts = await db.Parts
            .AsNoTracking()
            .Where(part => part.IsActive && part.QuantityInStock < LowStockThreshold)
            .OrderBy(part => part.QuantityInStock)
            .ThenBy(part => part.Name)
            .Take(20)
            .Select(part => new { part.PartId, part.Name, part.PartNumber, part.QuantityInStock })
            .ToArrayAsync(cancellationToken);

        if (lowStockParts.Length == 0)
        {
            return;
        }

        var cutoff = now.Subtract(LowStockNotificationCooldown);
        var alreadyNotifiedRecently = await db.Notifications
            .AsNoTracking()
            .AnyAsync(notification =>
                notification.RoleTarget == nameof(UserRole.Admin)
                && notification.Type == "LowStockAlert"
                && notification.CreatedAt >= cutoff,
                cancellationToken);

        if (alreadyNotifiedRecently)
        {
            return;
        }

        var sample = string.Join(
            ", ",
            lowStockParts
                .Take(4)
                .Select(part => $"{part.Name} ({part.PartNumber}) x{part.QuantityInStock}"));

        var message = lowStockParts.Length <= 4
            ? $"Low stock: {sample}."
            : $"Low stock: {sample} and {lowStockParts.Length - 4} more part(s).";

        await notifications.CreateForRoleAsync(
            UserRole.Admin,
            "LowStockAlert",
            "Low stock alert",
            message,
            "/admin/inventory",
            nameof(Part),
            null,
            cancellationToken);
    }

    private async Task SendOverdueCreditRemindersAsync(
        AppDbContext db,
        INotificationService notifications,
        IEmailService email,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var cutoff = now.AddMonths(-1);
        var reminderCutoff = now.Subtract(CreditReminderCooldown);

        var overdueSales = await db.SalesInvoices
            .AsNoTracking()
            .Include(invoice => invoice.Customer)
            .Where(invoice =>
                !invoice.IsCancelled
                && invoice.CreditAmount > 0
                && invoice.DueDate.HasValue
                && invoice.DueDate.Value <= cutoff)
            .OrderBy(invoice => invoice.DueDate)
            .Select(invoice => new
            {
                Kind = "Sales",
                InvoiceId = invoice.SalesInvoiceId,
                invoice.InvoiceNumber,
                invoice.CustomerId,
                invoice.Customer.Email,
                invoice.Customer.FullName,
                invoice.CreditAmount,
                invoice.DueDate
            })
            .Take(300)
            .ToArrayAsync(cancellationToken);

        var overdueBookings = await db.BookingInvoices
            .AsNoTracking()
            .Include(invoice => invoice.Customer)
            .Where(invoice =>
                !invoice.IsCancelled
                && invoice.CreditAmount > 0
                && invoice.DueDate.HasValue
                && invoice.DueDate.Value <= cutoff)
            .OrderBy(invoice => invoice.DueDate)
            .Select(invoice => new
            {
                Kind = "Service",
                InvoiceId = invoice.BookingInvoiceId,
                invoice.InvoiceNumber,
                invoice.CustomerId,
                invoice.Customer.Email,
                invoice.Customer.FullName,
                invoice.CreditAmount,
                invoice.DueDate
            })
            .Take(300)
            .ToArrayAsync(cancellationToken);

        var grouped = overdueSales
            .Concat(overdueBookings)
            .GroupBy(invoice => new { invoice.CustomerId, invoice.Email, invoice.FullName })
            .ToArray();

        foreach (var customerGroup in grouped)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var customerId = customerGroup.Key.CustomerId;

            var remindedRecently = await db.Notifications
                .AsNoTracking()
                .AnyAsync(notification =>
                    notification.UserId == customerId
                    && notification.Type == "OverdueCreditReminder"
                    && notification.CreatedAt >= reminderCutoff,
                    cancellationToken);

            if (remindedRecently)
            {
                continue;
            }

            var totalOverdue = customerGroup.Sum(invoice => invoice.CreditAmount);
            var invoiceCount = customerGroup.Count();
            var preview = $"You have {invoiceCount} invoice(s) with unpaid credits older than one month.";

            var detailsHtml = BuildInvoiceListHtml(customerGroup
                .OrderBy(invoice => invoice.DueDate)
                .Take(6)
                .Select(invoice => new ReminderInvoiceRow(
                    invoice.Kind,
                    invoice.InvoiceNumber,
                    invoice.CreditAmount,
                    invoice.DueDate!.Value))
                .ToArray());

            var body = $"""
                       <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:24px;">
                         This is a friendly reminder that you have unpaid credits older than one month.
                       </p>
                       <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 18px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                         <tr>
                           <td style="padding:16px 18px;">
                             <div style="color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Total overdue</div>
                             <div style="margin-top:6px;color:#111827;font-size:20px;font-weight:900;line-height:24px;">{FormatMoney(totalOverdue)}</div>
                           </td>
                           <td style="padding:16px 18px;text-align:right;">
                             <div style="color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Invoices</div>
                             <div style="margin-top:6px;color:#111827;font-size:20px;font-weight:900;line-height:24px;">{invoiceCount}</div>
                           </td>
                         </tr>
                       </table>
                       {detailsHtml}
                       <p style="margin:0;color:#4b5563;font-size:13px;line-height:20px;">
                         Please open your invoice history and settle the remaining balance at your earliest convenience.
                       </p>
                       """;

            await notifications.CreateForUserAsync(
                customerId,
                "OverdueCreditReminder",
                "Payment reminder",
                $"You have {invoiceCount} overdue invoice(s) with unpaid credits totaling {FormatMoney(totalOverdue)}.",
                "/customer/history",
                "Invoice",
                null,
                cancellationToken);

            try
            {
                await email.SendBrandedAsync(
                    new BrandedEmailMessage(
                        customerGroup.Key.Email,
                        "Payment reminder: overdue balance",
                        preview,
                        "Payment reminder",
                        body,
                        "View invoices",
                        BuildCustomerHistoryUrl(),
                        ToTextBody(customerGroup.Key.FullName, totalOverdue, invoiceCount),
                        customerGroup.Key.FullName),
                    cancellationToken);
            }
            catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException)
            {
                _logger.LogWarning(exception, "Overdue credit reminder email could not be sent to {CustomerEmail}.", customerGroup.Key.Email);
            }
        }
    }

    private sealed record ReminderInvoiceRow(string Kind, string InvoiceNumber, decimal CreditAmount, DateTime DueDate);

    private static string BuildInvoiceListHtml(IReadOnlyCollection<ReminderInvoiceRow> rows)
    {
        if (rows.Count == 0)
        {
            return string.Empty;
        }

        var bodyRows = string.Join("", rows.Select(row => $"""
            <tr>
              <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:800;">{HtmlEncoder.Default.Encode(row.Kind)}</td>
              <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:800;">{HtmlEncoder.Default.Encode(row.InvoiceNumber)}</td>
              <td align="right" style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:900;">{FormatMoney(row.CreditAmount)}</td>
              <td align="right" style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;font-weight:800;">Due {row.DueDate:dd MMM yyyy}</td>
            </tr>
            """));

        return $"""
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 18px;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                  <thead>
                    <tr style="background:#f9fafb;">
                      <th align="left" style="padding:10px 12px;color:#6b7280;font-size:11px;text-transform:uppercase;">Type</th>
                      <th align="left" style="padding:10px 12px;color:#6b7280;font-size:11px;text-transform:uppercase;">Invoice</th>
                      <th align="right" style="padding:10px 12px;color:#6b7280;font-size:11px;text-transform:uppercase;">Balance</th>
                      <th align="right" style="padding:10px 12px;color:#6b7280;font-size:11px;text-transform:uppercase;">Due date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows}
                  </tbody>
                </table>
                """;
    }

    private string BuildCustomerHistoryUrl()
    {
        return string.IsNullOrWhiteSpace(_emailOptions.AppBaseUrl)
            ? string.Empty
            : $"{_emailOptions.AppBaseUrl.TrimEnd('/')}/customer/history";
    }

    private static string ToTextBody(string name, decimal overdueAmount, int invoiceCount)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Hello {name},");
        builder.AppendLine();
        builder.AppendLine($"You have {invoiceCount} overdue invoice(s) with unpaid credits totaling {FormatMoney(overdueAmount)}.");
        builder.AppendLine("Please open your invoice history to review and settle the balance.");
        return builder.ToString();
    }

    private static string FormatMoney(decimal value)
    {
        return $"Rs. {value:N2}";
    }
}

