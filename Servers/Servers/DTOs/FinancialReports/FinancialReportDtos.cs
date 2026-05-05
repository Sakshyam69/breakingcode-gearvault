namespace Servers.DTOs.FinancialReports;

public enum FinancialReportGranularity
{
    Daily,
    Monthly,
    Yearly
}

public sealed record FinancialReportSummaryResponse(
    decimal PartsSalesRevenue,
    decimal ServiceRevenue,
    decimal TotalRevenue,
    decimal PurchaseExpense,
    decimal NetRevenue,
    int SalesInvoiceCount,
    int BookingInvoiceCount,
    int PurchaseInvoiceCount);

public sealed record FinancialReportSeriesPointResponse(
    DateTime PeriodStart,
    string Label,
    decimal PartsSalesRevenue,
    decimal ServiceRevenue,
    decimal TotalRevenue,
    decimal PurchaseExpense,
    decimal NetRevenue);

public sealed record FinancialReportResponse(
    FinancialReportGranularity Granularity,
    DateTime From,
    DateTime To,
    FinancialReportSummaryResponse Summary,
    IReadOnlyCollection<FinancialReportSeriesPointResponse> Series);

