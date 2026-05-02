using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.CustomerReports;
using Servers.Models;

namespace Servers.Services;

public interface ICustomerReportService
{
    Task<CustomerReportsResponse> GetReportsAsync(
        DateTime? from,
        DateTime? to,
        CustomerReportType reportType,
        string? query,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CustomerReportRequestResponse>> GetRequestsAsync(
        CustomerReportRequestStatus? status,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CustomerReportRequestResponse>> GetMyRequestsAsync(
        int customerId,
        CancellationToken cancellationToken);

    Task<CustomerReportRequestResponse> CreateRequestAsync(
        int customerId,
        CreateCustomerReportRequestRequest request,
        CancellationToken cancellationToken);

    Task<CustomerReportRequestResponse?> CompleteRequestAsync(
        int requestId,
        int staffId,
        CompleteCustomerReportRequestRequest request,
        CancellationToken cancellationToken);
}

public sealed class CustomerReportValidationException : Exception
{
    public CustomerReportValidationException(string message)
        : base(message)
    {
    }
}

public sealed class CustomerReportService : ICustomerReportService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public CustomerReportService(AppDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<CustomerReportsResponse> GetReportsAsync(
        DateTime? from,
        DateTime? to,
        CustomerReportType reportType,
        string? query,
        CancellationToken cancellationToken)
    {
        var fromUtc = ToUtcNullable(from);
        var toUtc = ToInclusiveUtcNullable(to);
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;

        var customers = await _db.Users
            .AsNoTracking()
            .Where(user => user.Role == UserRole.Customer)
            .OrderBy(user => user.FullName)
            .ToArrayAsync(cancellationToken);

        var customerIds = customers.Select(customer => customer.Id).ToArray();
        var salesInvoices = Array.Empty<SalesInvoice>();
        var bookingInvoices = Array.Empty<BookingInvoice>();

        if (reportType is CustomerReportType.SalesOnly or CustomerReportType.Combined)
        {
            salesInvoices = await _db.SalesInvoices
                .AsNoTracking()
                .Include(invoice => invoice.Items)
                .Where(invoice =>
                    customerIds.Contains(invoice.CustomerId)
                    && !invoice.IsCancelled
                    && (!fromUtc.HasValue || invoice.InvoiceDate >= fromUtc.Value)
                    && (!toUtc.HasValue || invoice.InvoiceDate <= toUtc.Value))
                .ToArrayAsync(cancellationToken);
        }

        if (reportType is CustomerReportType.ServicesOnly or CustomerReportType.Combined)
        {
            bookingInvoices = await _db.BookingInvoices
                .AsNoTracking()
                .Include(invoice => invoice.ServiceAppointment)
                    .ThenInclude(appointment => appointment.Vehicle)
                .Where(invoice =>
                    customerIds.Contains(invoice.CustomerId)
                    && !invoice.IsCancelled
                    && (!fromUtc.HasValue || invoice.InvoiceDate >= fromUtc.Value)
                    && (!toUtc.HasValue || invoice.InvoiceDate <= toUtc.Value))
                .ToArrayAsync(cancellationToken);
        }

        var appointments = Array.Empty<ServiceAppointment>();
        var partRequests = Array.Empty<PartRequest>();

        if (reportType is CustomerReportType.ServicesOnly or CustomerReportType.Combined)
        {
            appointments = await _db.ServiceAppointments
                .AsNoTracking()
                .Where(appointment =>
                    customerIds.Contains(appointment.CustomerId)
                    && (!fromUtc.HasValue || appointment.CreatedAt >= fromUtc.Value)
                    && (!toUtc.HasValue || appointment.CreatedAt <= toUtc.Value))
                .ToArrayAsync(cancellationToken);
        }

        if (reportType is CustomerReportType.SalesOnly or CustomerReportType.Combined)
        {
            partRequests = await _db.PartRequests
                .AsNoTracking()
                .Where(request =>
                    customerIds.Contains(request.CustomerId)
                    && (!fromUtc.HasValue || request.CreatedAt >= fromUtc.Value)
                    && (!toUtc.HasValue || request.CreatedAt <= toUtc.Value))
                .ToArrayAsync(cancellationToken);
        }

        var vehicles = await _db.CustomerVehicles
            .AsNoTracking()
            .Where(vehicle => customerIds.Contains(vehicle.CustomerId) && vehicle.IsActive)
            .ToArrayAsync(cancellationToken);

        var rows = customers.Select(customer =>
            BuildRow(
                customer,
                salesInvoices.Where(invoice => invoice.CustomerId == customer.Id).ToArray(),
                bookingInvoices.Where(invoice => invoice.CustomerId == customer.Id).ToArray(),
                appointments.Where(appointment => appointment.CustomerId == customer.Id).ToArray(),
                partRequests.Where(request => request.CustomerId == customer.Id).ToArray(),
                vehicles.Where(vehicle => vehicle.CustomerId == customer.Id).ToArray()))
            .Where(row => IsActiveReportRow(row))
            .Where(row => MatchesQuery(row, normalizedQuery))
            .OrderByDescending(row => row.TotalSpent)
            .ThenByDescending(row => row.SalesInvoiceCount + row.BookingInvoiceCount + row.ServiceAppointmentCount + row.PartRequestCount)
            .ThenBy(row => row.CustomerName)
            .ToArray();

        var summary = new CustomerReportSummaryResponse(
            customers.Length,
            rows.Length,
            rows.Sum(row => row.SalesSpent),
            rows.Sum(row => row.ServiceSpent),
            rows.Sum(row => row.TotalSpent),
            rows.Sum(row => row.TotalCredit),
            rows.Sum(row => row.SalesInvoiceCount),
            rows.Sum(row => row.BookingInvoiceCount),
            rows.Sum(row => row.ServiceAppointmentCount),
            rows.Sum(row => row.PartRequestCount));

        return new CustomerReportsResponse(
            summary,
            rows.OrderByDescending(row => row.TotalSpent).Take(10).ToArray(),
            rows.OrderByDescending(row => row.SalesInvoiceCount + row.BookingInvoiceCount + row.ServiceAppointmentCount + row.PartRequestCount).Take(10).ToArray(),
            rows.Where(row => row.TotalCredit > 0).OrderByDescending(row => row.TotalCredit).Take(10).ToArray(),
            rows.Where(row => row.SalesInvoiceCount > 0 || row.PartRequestCount > 0).OrderByDescending(row => row.SalesSpent + row.PartRequestCount).Take(10).ToArray(),
            rows.Where(row => row.BookingInvoiceCount > 0 || row.ServiceAppointmentCount > 0).OrderByDescending(row => row.ServiceSpent + row.ServiceAppointmentCount).Take(10).ToArray(),
            rows);
    }

    public async Task<IReadOnlyCollection<CustomerReportRequestResponse>> GetRequestsAsync(
        CustomerReportRequestStatus? status,
        CancellationToken cancellationToken)
    {
        var requestsQuery = QueryRequests().AsNoTracking();
        if (status.HasValue)
        {
            requestsQuery = requestsQuery.Where(request => request.Status == status.Value);
        }

        var requests = await requestsQuery
            .OrderBy(request => request.Status != CustomerReportRequestStatus.Pending)
            .ThenByDescending(request => request.CreatedAt)
            .Take(100)
            .ToArrayAsync(cancellationToken);

        return requests.Select(ToRequestResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<CustomerReportRequestResponse>> GetMyRequestsAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var requests = await QueryRequests()
            .AsNoTracking()
            .Where(request => request.CustomerId == customerId)
            .OrderByDescending(request => request.CreatedAt)
            .Take(25)
            .ToArrayAsync(cancellationToken);

        return requests.Select(ToRequestResponse).ToArray();
    }

    public async Task<CustomerReportRequestResponse> CreateRequestAsync(
        int customerId,
        CreateCustomerReportRequestRequest request,
        CancellationToken cancellationToken)
    {
        var customer = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == customerId && user.Role == UserRole.Customer, cancellationToken);

        if (customer is null)
        {
            throw new CustomerReportValidationException("Customer account was not found.");
        }

        var reportRequest = new CustomerReportRequest
        {
            CustomerId = customerId,
            ReportType = request.ReportType,
            Notes = request.Notes.Trim(),
            Status = CustomerReportRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _db.CustomerReportRequests.Add(reportRequest);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForRoleAsync(
            UserRole.Staff,
            "CustomerReportRequested",
            "Customer report requested",
            $"{GetCustomerName(customer)} requested a {FormatReportType(request.ReportType)} report.",
            "/staff/reports",
            nameof(CustomerReportRequest),
            reportRequest.CustomerReportRequestId,
            cancellationToken);

        var createdRequest = await QueryRequests()
            .AsNoTracking()
            .FirstAsync(current => current.CustomerReportRequestId == reportRequest.CustomerReportRequestId, cancellationToken);

        return ToRequestResponse(createdRequest);
    }

    public async Task<CustomerReportRequestResponse?> CompleteRequestAsync(
        int requestId,
        int staffId,
        CompleteCustomerReportRequestRequest request,
        CancellationToken cancellationToken)
    {
        var reportRequest = await QueryRequests()
            .FirstOrDefaultAsync(current => current.CustomerReportRequestId == requestId, cancellationToken);

        if (reportRequest is null)
        {
            return null;
        }

        reportRequest.Status = CustomerReportRequestStatus.Sent;
        reportRequest.StaffNote = request.StaffNote.Trim();
        reportRequest.CompletedByStaffId = staffId;
        reportRequest.CompletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForUserAsync(
            reportRequest.CustomerId,
            "CustomerReportSent",
            "Requested report is ready",
            $"Staff prepared your {FormatReportType(reportRequest.ReportType)} report.",
            "/customer/settings",
            nameof(CustomerReportRequest),
            reportRequest.CustomerReportRequestId,
            cancellationToken);

        return ToRequestResponse(reportRequest);
    }

    private IQueryable<CustomerReportRequest> QueryRequests()
    {
        return _db.CustomerReportRequests
            .Include(request => request.Customer)
            .Include(request => request.CompletedByStaff);
    }

    private static CustomerReportRowResponse BuildRow(
        User customer,
        IReadOnlyCollection<SalesInvoice> salesInvoices,
        IReadOnlyCollection<BookingInvoice> bookingInvoices,
        IReadOnlyCollection<ServiceAppointment> appointments,
        IReadOnlyCollection<PartRequest> partRequests,
        IReadOnlyCollection<CustomerVehicle> vehicles)
    {
        var salesSpent = salesInvoices.Sum(invoice => invoice.TotalAmount);
        var serviceSpent = bookingInvoices.Sum(invoice => invoice.TotalAmount);
        var salesCredit = salesInvoices.Sum(invoice => invoice.CreditAmount);
        var serviceCredit = bookingInvoices.Sum(invoice => invoice.CreditAmount);
        var completedServiceCount = appointments.Count(appointment => appointment.Status == ServiceAppointmentStatus.Completed);
        var lastActivityAt = new[]
        {
            salesInvoices.Select(invoice => (DateTime?)invoice.InvoiceDate).DefaultIfEmpty().Max(),
            bookingInvoices.Select(invoice => (DateTime?)invoice.InvoiceDate).DefaultIfEmpty().Max(),
            appointments.Select(appointment => (DateTime?)appointment.CreatedAt).DefaultIfEmpty().Max(),
            partRequests.Select(request => (DateTime?)request.CreatedAt).DefaultIfEmpty().Max()
        }.Where(date => date.HasValue).Max();

        var totalSpent = salesSpent + serviceSpent;
        var totalCredit = salesCredit + serviceCredit;
        var activityCount = salesInvoices.Count + bookingInvoices.Count + appointments.Count + partRequests.Count;
        var segment = GetSegment(totalSpent, totalCredit, activityCount, salesInvoices.Count, bookingInvoices.Count);

        return new CustomerReportRowResponse(
            customer.Id,
            GetCustomerName(customer),
            customer.Email,
            customer.Phone,
            vehicles.Count,
            string.Join(", ", vehicles.Select(vehicle => vehicle.VehicleNumber).Where(value => !string.IsNullOrWhiteSpace(value)).Take(3)),
            salesSpent,
            serviceSpent,
            totalSpent,
            salesCredit,
            serviceCredit,
            totalCredit,
            salesInvoices.Count,
            bookingInvoices.Count,
            appointments.Count,
            completedServiceCount,
            partRequests.Count,
            lastActivityAt,
            segment,
            GetIcon(segment),
            salesInvoices
                .OrderByDescending(invoice => invoice.InvoiceDate)
                .Select(ToSalesDetail)
                .ToArray(),
            bookingInvoices
                .OrderByDescending(invoice => invoice.InvoiceDate)
                .Select(ToServiceDetail)
                .ToArray());
    }

    private static CustomerReportSalesDetailResponse ToSalesDetail(SalesInvoice invoice)
    {
        return new CustomerReportSalesDetailResponse(
            invoice.SalesInvoiceId,
            invoice.InvoiceNumber,
            invoice.InvoiceDate,
            invoice.PaymentStatus.ToString(),
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.CreditAmount,
            string.Join(", ", invoice.Items
                .OrderBy(item => item.PartName)
                .Select(item => $"{item.PartName} x{item.Quantity}")));
    }

    private static CustomerReportServiceDetailResponse ToServiceDetail(BookingInvoice invoice)
    {
        var appointment = invoice.ServiceAppointment;
        var serviceType = string.IsNullOrWhiteSpace(appointment.CustomServiceType)
            ? appointment.ServiceType
            : appointment.CustomServiceType;
        var vehicle = appointment.Vehicle;
        var vehicleLabel = vehicle is null
            ? string.Empty
            : $"{vehicle.Make} {vehicle.Model} {vehicle.VehicleNumber}".Trim();

        return new CustomerReportServiceDetailResponse(
            invoice.BookingInvoiceId,
            invoice.InvoiceNumber,
            appointment.AppointmentNumber,
            invoice.InvoiceDate,
            serviceType,
            vehicleLabel,
            invoice.PaymentStatus.ToString(),
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.CreditAmount,
            invoice.WorkSummary);
    }

    private static bool IsActiveReportRow(CustomerReportRowResponse row)
    {
        return row.TotalSpent > 0
            || row.TotalCredit > 0
            || row.ServiceAppointmentCount > 0
            || row.PartRequestCount > 0;
    }

    private static bool MatchesQuery(CustomerReportRowResponse row, string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return true;
        }

        return row.CustomerName.ToLowerInvariant().Contains(query)
            || row.Email.ToLowerInvariant().Contains(query)
            || row.Phone.ToLowerInvariant().Contains(query)
            || row.CustomerId.ToString().Contains(query)
            || row.VehicleNumbers.ToLowerInvariant().Contains(query);
    }

    private static string GetSegment(
        decimal totalSpent,
        decimal totalCredit,
        int activityCount,
        int salesInvoiceCount,
        int bookingInvoiceCount)
    {
        if (totalCredit > 0)
        {
            return "Pending Credit";
        }

        if (totalSpent >= 5000)
        {
            return "Best Client";
        }

        if (activityCount >= 5)
        {
            return "Regular Client";
        }

        if (bookingInvoiceCount > salesInvoiceCount)
        {
            return "Service Client";
        }

        if (salesInvoiceCount > 0)
        {
            return "Parts Client";
        }

        return "New Client";
    }

    private static string GetIcon(string segment)
    {
        return segment switch
        {
            "Best Client" => "Crown",
            "Regular Client" => "Star",
            "Pending Credit" => "AlertTriangle",
            "Service Client" => "Wrench",
            "Parts Client" => "Package",
            _ => "User"
        };
    }

    private static CustomerReportRequestResponse ToRequestResponse(CustomerReportRequest request)
    {
        return new CustomerReportRequestResponse(
            request.CustomerReportRequestId,
            request.CustomerId,
            GetCustomerName(request.Customer),
            request.Customer.Email,
            request.Customer.Phone,
            request.ReportType,
            request.Status,
            request.Notes,
            request.StaffNote,
            request.CompletedByStaffId,
            request.CompletedByStaff is null ? string.Empty : GetCustomerName(request.CompletedByStaff),
            request.CreatedAt,
            request.CompletedAt);
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

    private static string GetCustomerName(User user)
    {
        if (!string.IsNullOrWhiteSpace(user.FullName))
        {
            return user.FullName;
        }

        return user.Email;
    }

    private static string FormatReportType(CustomerReportType reportType)
    {
        return reportType switch
        {
            CustomerReportType.SalesOnly => "sales only",
            CustomerReportType.ServicesOnly => "services only",
            _ => "sales and services"
        };
    }
}
