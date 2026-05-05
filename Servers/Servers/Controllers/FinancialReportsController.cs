using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.FinancialReports;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.Admin))]
[Route("api/financial-reports")]
public sealed class FinancialReportsController : ControllerBase
{
    private readonly IFinancialReportService _reports;

    public FinancialReportsController(IFinancialReportService reports)
    {
        _reports = reports;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<FinancialReportResponse>> GetFinancialReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] FinancialReportGranularity granularity = FinancialReportGranularity.Daily,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var report = await _reports.GetFinancialReportAsync(from, to, granularity, cancellationToken);
            return Ok(report);
        }
        catch (FinancialReportValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}

