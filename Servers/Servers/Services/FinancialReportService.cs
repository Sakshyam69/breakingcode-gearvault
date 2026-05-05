using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.FinancialReports;

namespace Servers.Services;

public interface IFinancialReportService
{
    Task<FinancialReportResponse> GetFinancialReportAsync(
        DateTime? from,
        DateTime? to,
        FinancialReportGranularity granularity,
        CancellationToken cancellationToken);
}

public sealed class FinancialReportValidationException : Exception
{
    public FinancialReportValidationException(string message)
        : base(message)
    {
    }
}

public sealed class FinancialReportService : IFinancialReportService
{
    private readonly AppDbContext _db;

    public FinancialReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FinancialReportResponse> GetFinancialReportAsync(
        DateTime? from,
        DateTime? to,
        FinancialReportGranularity granularity,
        CancellationToken cancellationToken)
    {
        var toUtc = ToInclusiveUtcNullable(to) ?? DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
        var fromUtc = ToUtcNullable(from) ?? GetDefaultFrom(toUtc, granularity);

        if (fromUtc > toUtc)
        {
            throw new FinancialReportValidationException("From date cannot be after To date.");
        }

        var salesRows = await GetSalesInvoiceRowsAsync(fromUtc, toUtc, granularity, cancellationToken);
        var bookingRows = await GetBookingInvoiceRowsAsync(fromUtc, toUtc, granularity, cancellationToken);
        var purchaseRows = await GetPurchaseInvoiceRowsAsync(fromUtc, toUtc, granularity, cancellationToken);

        var series = BuildSeries(fromUtc, toUtc, granularity, salesRows, bookingRows, purchaseRows);
        var summary = BuildSummary(series, salesRows.Sum(row => row.Count), bookingRows.Sum(row => row.Count), purchaseRows.Sum(row => row.Count));

        return new FinancialReportResponse(granularity, fromUtc, toUtc, summary, series);
    }

    private sealed record GroupRow(DateTime PeriodStart, decimal TotalAmount, int Count);

    private async Task<GroupRow[]> GetSalesInvoiceRowsAsync(
        DateTime fromUtc,
        DateTime toUtc,
        FinancialReportGranularity granularity,
        CancellationToken cancellationToken)
    {
        var query = _db.SalesInvoices
            .AsNoTracking()
            .Where(invoice => !invoice.IsCancelled && invoice.InvoiceDate >= fromUtc && invoice.InvoiceDate <= toUtc);

        return granularity switch
        {
            FinancialReportGranularity.Daily => await query
                .GroupBy(invoice => invoice.InvoiceDate.Date)
                .Select(group => new GroupRow(group.Key, group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
            FinancialReportGranularity.Monthly => await query
                .GroupBy(invoice => new { invoice.InvoiceDate.Year, invoice.InvoiceDate.Month })
                .Select(group => new GroupRow(new DateTime(group.Key.Year, group.Key.Month, 1), group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
            _ => await query
                .GroupBy(invoice => invoice.InvoiceDate.Year)
                .Select(group => new GroupRow(new DateTime(group.Key, 1, 1), group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
        };
    }

    private async Task<GroupRow[]> GetBookingInvoiceRowsAsync(
        DateTime fromUtc,
        DateTime toUtc,
        FinancialReportGranularity granularity,
        CancellationToken cancellationToken)
    {
        var query = _db.BookingInvoices
            .AsNoTracking()
            .Where(invoice => !invoice.IsCancelled && invoice.InvoiceDate >= fromUtc && invoice.InvoiceDate <= toUtc);

        return granularity switch
        {
            FinancialReportGranularity.Daily => await query
                .GroupBy(invoice => invoice.InvoiceDate.Date)
                .Select(group => new GroupRow(group.Key, group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
            FinancialReportGranularity.Monthly => await query
                .GroupBy(invoice => new { invoice.InvoiceDate.Year, invoice.InvoiceDate.Month })
                .Select(group => new GroupRow(new DateTime(group.Key.Year, group.Key.Month, 1), group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
            _ => await query
                .GroupBy(invoice => invoice.InvoiceDate.Year)
                .Select(group => new GroupRow(new DateTime(group.Key, 1, 1), group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
        };
    }

    private async Task<GroupRow[]> GetPurchaseInvoiceRowsAsync(
        DateTime fromUtc,
        DateTime toUtc,
        FinancialReportGranularity granularity,
        CancellationToken cancellationToken)
    {
        var query = _db.PurchaseInvoices
            .AsNoTracking()
            .Where(invoice => !invoice.IsCancelled && invoice.PurchaseDate >= fromUtc && invoice.PurchaseDate <= toUtc);

        return granularity switch
        {
            FinancialReportGranularity.Daily => await query
                .GroupBy(invoice => invoice.PurchaseDate.Date)
                .Select(group => new GroupRow(group.Key, group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
            FinancialReportGranularity.Monthly => await query
                .GroupBy(invoice => new { invoice.PurchaseDate.Year, invoice.PurchaseDate.Month })
                .Select(group => new GroupRow(new DateTime(group.Key.Year, group.Key.Month, 1), group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
            _ => await query
                .GroupBy(invoice => invoice.PurchaseDate.Year)
                .Select(group => new GroupRow(new DateTime(group.Key, 1, 1), group.Sum(i => i.TotalAmount), group.Count()))
                .ToArrayAsync(cancellationToken),
        };
    }

    private static FinancialReportSeriesPointResponse[] BuildSeries(
        DateTime fromUtc,
        DateTime toUtc,
        FinancialReportGranularity granularity,
        GroupRow[] salesRows,
        GroupRow[] bookingRows,
        GroupRow[] purchaseRows)
    {
        var sales = salesRows.ToDictionary(row => NormalizePeriodStart(row.PeriodStart, granularity), row => row.TotalAmount);
        var services = bookingRows.ToDictionary(row => NormalizePeriodStart(row.PeriodStart, granularity), row => row.TotalAmount);
        var purchases = purchaseRows.ToDictionary(row => NormalizePeriodStart(row.PeriodStart, granularity), row => row.TotalAmount);

        var series = new List<FinancialReportSeriesPointResponse>();
        foreach (var periodStart in EnumeratePeriods(fromUtc, toUtc, granularity))
        {
            var normalized = NormalizePeriodStart(periodStart, granularity);
            var partsSales = sales.TryGetValue(normalized, out var partsValue) ? partsValue : 0m;
            var serviceRevenue = services.TryGetValue(normalized, out var serviceValue) ? serviceValue : 0m;
            var purchaseExpense = purchases.TryGetValue(normalized, out var purchaseValue) ? purchaseValue : 0m;
            var revenue = partsSales + serviceRevenue;
            var net = revenue - purchaseExpense;

            series.Add(new FinancialReportSeriesPointResponse(
                normalized,
                FormatLabel(normalized, granularity),
                partsSales,
                serviceRevenue,
                revenue,
                purchaseExpense,
                net));
        }

        return series.ToArray();
    }

    private static FinancialReportSummaryResponse BuildSummary(
        IReadOnlyCollection<FinancialReportSeriesPointResponse> series,
        int salesInvoiceCount,
        int bookingInvoiceCount,
        int purchaseInvoiceCount)
    {
        var partsSales = series.Sum(point => point.PartsSalesRevenue);
        var services = series.Sum(point => point.ServiceRevenue);
        var revenue = series.Sum(point => point.TotalRevenue);
        var purchases = series.Sum(point => point.PurchaseExpense);
        var net = series.Sum(point => point.NetRevenue);

        return new FinancialReportSummaryResponse(
            partsSales,
            services,
            revenue,
            purchases,
            net,
            salesInvoiceCount,
            bookingInvoiceCount,
            purchaseInvoiceCount);
    }

    private static IEnumerable<DateTime> EnumeratePeriods(DateTime fromUtc, DateTime toUtc, FinancialReportGranularity granularity)
    {
        var current = NormalizePeriodStart(fromUtc, granularity);
        var end = NormalizePeriodStart(toUtc, granularity);

        while (current <= end)
        {
            yield return current;
            current = granularity switch
            {
                FinancialReportGranularity.Daily => current.AddDays(1),
                FinancialReportGranularity.Monthly => current.AddMonths(1),
                _ => current.AddYears(1),
            };
        }
    }

    private static DateTime NormalizePeriodStart(DateTime value, FinancialReportGranularity granularity)
    {
        value = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        return granularity switch
        {
            FinancialReportGranularity.Daily => value.Date,
            FinancialReportGranularity.Monthly => new DateTime(value.Year, value.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => new DateTime(value.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    private static string FormatLabel(DateTime periodStart, FinancialReportGranularity granularity)
    {
        return granularity switch
        {
            FinancialReportGranularity.Daily => periodStart.ToString("dd MMM yyyy"),
            FinancialReportGranularity.Monthly => periodStart.ToString("MMM yyyy"),
            _ => periodStart.ToString("yyyy"),
        };
    }

    private static DateTime GetDefaultFrom(DateTime toUtc, FinancialReportGranularity granularity)
    {
        var normalizedTo = NormalizePeriodStart(toUtc, granularity);
        return granularity switch
        {
            FinancialReportGranularity.Daily => normalizedTo.AddDays(-29),
            FinancialReportGranularity.Monthly => normalizedTo.AddMonths(-11),
            _ => normalizedTo.AddYears(-4),
        };
    }

    private static DateTime? ToUtcNullable(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return DateTime.SpecifyKind(value.Value.Date, DateTimeKind.Utc);
    }

    private static DateTime? ToInclusiveUtcNullable(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return DateTime.SpecifyKind(value.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
    }
}

