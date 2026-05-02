using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.ServiceAppointments;
using Servers.Models;

namespace Servers.Services;

public interface IServiceAppointmentService
{
    Task<IReadOnlyCollection<ServiceAppointmentResponse>> GetMyAppointmentsAsync(
        int customerId,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<ServiceAppointmentResponse>> GetAppointmentsAsync(
        string? query,
        ServiceAppointmentStatus? status,
        DateTime? date,
        CancellationToken cancellationToken);

    Task<ServiceAppointmentResponse?> GetAppointmentAsync(
        int serviceAppointmentId,
        int? requiredCustomerId,
        CancellationToken cancellationToken);

    Task<ServiceAppointmentResponse> CreateAppointmentAsync(
        int customerId,
        CreateServiceAppointmentRequest request,
        CancellationToken cancellationToken);

    Task<ServiceAppointmentResponse?> UpdateStatusAsync(
        int serviceAppointmentId,
        UpdateServiceAppointmentStatusRequest request,
        int actorUserId,
        CancellationToken cancellationToken);

    Task<bool> CancelMyAppointmentAsync(
        int serviceAppointmentId,
        int customerId,
        CancelServiceAppointmentRequest request,
        CancellationToken cancellationToken);
}

public sealed class ServiceAppointmentValidationException : Exception
{
    public ServiceAppointmentValidationException(string message)
        : base(message)
    {
    }
}

public sealed class ServiceAppointmentService : IServiceAppointmentService
{
    private static readonly HashSet<ServiceAppointmentStatus> ClosedStatuses =
    [
        ServiceAppointmentStatus.Completed,
        ServiceAppointmentStatus.Cancelled,
        ServiceAppointmentStatus.Rejected,
        ServiceAppointmentStatus.NoShow
    ];

    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public ServiceAppointmentService(AppDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<IReadOnlyCollection<ServiceAppointmentResponse>> GetMyAppointmentsAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var appointments = await QueryAppointments()
            .AsNoTracking()
            .Where(appointment => appointment.CustomerId == customerId)
            .OrderByDescending(appointment => appointment.PreferredDate)
            .ThenByDescending(appointment => appointment.CreatedAt)
            .ToArrayAsync(cancellationToken);

        return await ToResponsesAsync(appointments, cancellationToken);
    }

    public async Task<IReadOnlyCollection<ServiceAppointmentResponse>> GetAppointmentsAsync(
        string? query,
        ServiceAppointmentStatus? status,
        DateTime? date,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var appointmentsQuery = QueryAppointments().AsNoTracking();

        if (status.HasValue)
        {
            appointmentsQuery = appointmentsQuery.Where(appointment => appointment.Status == status.Value);
        }

        if (date.HasValue)
        {
            var targetDate = ToUtcDateTime(date.Value).Date;
            var nextDate = targetDate.AddDays(1);
            appointmentsQuery = appointmentsQuery.Where(appointment =>
                appointment.PreferredDate >= targetDate
                && appointment.PreferredDate < nextDate);
        }

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            appointmentsQuery = appointmentsQuery.Where(appointment =>
                appointment.AppointmentNumber.ToLower().Contains(normalizedQuery)
                || appointment.ServiceType.ToLower().Contains(normalizedQuery)
                || appointment.CustomServiceType.ToLower().Contains(normalizedQuery)
                || appointment.Customer.FullName.ToLower().Contains(normalizedQuery)
                || appointment.Customer.Email.ToLower().Contains(normalizedQuery)
                || appointment.Customer.Phone.ToLower().Contains(normalizedQuery)
                || appointment.Vehicle.VehicleNumber.ToLower().Contains(normalizedQuery)
                || appointment.Vehicle.Make.ToLower().Contains(normalizedQuery)
                || appointment.Vehicle.Model.ToLower().Contains(normalizedQuery));
        }

        var appointments = await appointmentsQuery
            .OrderByDescending(appointment => appointment.PreferredDate)
            .ThenByDescending(appointment => appointment.CreatedAt)
            .Take(150)
            .ToArrayAsync(cancellationToken);

        return await ToResponsesAsync(appointments, cancellationToken);
    }

    public async Task<ServiceAppointmentResponse?> GetAppointmentAsync(
        int serviceAppointmentId,
        int? requiredCustomerId,
        CancellationToken cancellationToken)
    {
        var appointment = await QueryAppointments()
            .AsNoTracking()
            .FirstOrDefaultAsync(current =>
                current.ServiceAppointmentId == serviceAppointmentId
                && (!requiredCustomerId.HasValue || current.CustomerId == requiredCustomerId.Value),
                cancellationToken);

        return appointment is null ? null : await ToResponseAsync(appointment, cancellationToken);
    }

    public async Task<ServiceAppointmentResponse> CreateAppointmentAsync(
        int customerId,
        CreateServiceAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureCustomerExistsAsync(customerId, cancellationToken);
        var vehicle = await GetCustomerVehicleAsync(customerId, request.VehicleId, cancellationToken);
        ValidateCreateRequest(request);

        var appointment = new ServiceAppointment
        {
            AppointmentNumber = await GenerateAppointmentNumberAsync(cancellationToken),
            CustomerId = customerId,
            VehicleId = vehicle.CustomerVehicleId,
            ServiceType = request.ServiceType.Trim(),
            CustomServiceType = request.CustomServiceType.Trim(),
            Urgency = request.Urgency,
            Status = ServiceAppointmentStatus.Pending,
            PreferredDate = ToUtcDateTime(request.PreferredDate).Date,
            PreferredTimeSlot = request.PreferredTimeSlot.Trim(),
            MileageAtBooking = request.MileageAtBooking ?? vehicle.Mileage,
            ProblemDescription = request.ProblemDescription.Trim(),
            CustomerNote = request.CustomerNote.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.ServiceAppointments.Add(appointment);
        await _db.SaveChangesAsync(cancellationToken);

        await NotifyStaffAndAdminsAsync(
            "ServiceAppointmentCreated",
            "New service appointment",
            $"{GetUserDisplayName(vehicle.Customer)} booked {GetDisplayServiceType(appointment)} for {GetVehicleLabel(vehicle)}.",
            "/staff/bookings",
            appointment.ServiceAppointmentId,
            cancellationToken);

        var createdAppointment = await GetAppointmentWithDetailsAsync(
            appointment.ServiceAppointmentId,
            cancellationToken);
        return await ToResponseAsync(createdAppointment ?? appointment, cancellationToken);
    }

    public async Task<ServiceAppointmentResponse?> UpdateStatusAsync(
        int serviceAppointmentId,
        UpdateServiceAppointmentStatusRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var appointment = await QueryAppointments()
            .FirstOrDefaultAsync(current => current.ServiceAppointmentId == serviceAppointmentId, cancellationToken);

        if (appointment is null)
        {
            return null;
        }

        if (ClosedStatuses.Contains(appointment.Status))
        {
            throw new ServiceAppointmentValidationException("This appointment is already closed.");
        }

        await ApplyAssignedStaffAsync(appointment, request.AssignedStaffId, actorUserId, cancellationToken);
        ApplyStatusUpdate(appointment, request);

        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForUserAsync(
            appointment.CustomerId,
            "ServiceAppointmentUpdated",
            "Service appointment updated",
            $"Your appointment {appointment.AppointmentNumber} is now {FormatStatus(appointment.Status)}.",
            "/customer/bookings",
            nameof(ServiceAppointment),
            appointment.ServiceAppointmentId,
            cancellationToken);

        var updatedAppointment = await GetAppointmentWithDetailsAsync(
            appointment.ServiceAppointmentId,
            cancellationToken);
        return await ToResponseAsync(updatedAppointment ?? appointment, cancellationToken);
    }

    public async Task<bool> CancelMyAppointmentAsync(
        int serviceAppointmentId,
        int customerId,
        CancelServiceAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await QueryAppointments()
            .FirstOrDefaultAsync(current =>
                current.ServiceAppointmentId == serviceAppointmentId
                && current.CustomerId == customerId,
                cancellationToken);

        if (appointment is null)
        {
            return false;
        }

        if (appointment.Status is not (ServiceAppointmentStatus.Pending or ServiceAppointmentStatus.Confirmed))
        {
            throw new ServiceAppointmentValidationException("Only pending or confirmed appointments can be cancelled by the customer.");
        }

        appointment.Status = ServiceAppointmentStatus.Cancelled;
        appointment.CancelledByRole = nameof(UserRole.Customer);
        appointment.CancellationReason = request.CancellationReason.Trim();
        appointment.UpdatedAt = DateTime.UtcNow;
        appointment.CancelledAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await NotifyStaffAndAdminsAsync(
            "ServiceAppointmentCancelled",
            "Appointment cancelled",
            $"{appointment.Customer.FullName} cancelled appointment {appointment.AppointmentNumber}.",
            "/staff/bookings",
            appointment.ServiceAppointmentId,
            cancellationToken);

        return true;
    }

    private IQueryable<ServiceAppointment> QueryAppointments()
    {
        return _db.ServiceAppointments
            .Include(appointment => appointment.Customer)
            .Include(appointment => appointment.Vehicle)
            .Include(appointment => appointment.AssignedStaff)
            .Include(appointment => appointment.BookingInvoice);
    }

    private Task<ServiceAppointment?> GetAppointmentWithDetailsAsync(
        int serviceAppointmentId,
        CancellationToken cancellationToken)
    {
        return QueryAppointments()
            .AsNoTracking()
            .FirstOrDefaultAsync(appointment =>
                appointment.ServiceAppointmentId == serviceAppointmentId,
                cancellationToken);
    }

    private async Task EnsureCustomerExistsAsync(int customerId, CancellationToken cancellationToken)
    {
        var exists = await _db.Users.AnyAsync(
            user => user.Id == customerId && user.Role == UserRole.Customer,
            cancellationToken);

        if (!exists)
        {
            throw new ServiceAppointmentValidationException("Customer account was not found.");
        }
    }

    private async Task<CustomerVehicle> GetCustomerVehicleAsync(
        int customerId,
        int vehicleId,
        CancellationToken cancellationToken)
    {
        var vehicle = await _db.CustomerVehicles
            .Include(current => current.Customer)
            .FirstOrDefaultAsync(current =>
                current.CustomerVehicleId == vehicleId
                && current.CustomerId == customerId
                && current.IsActive,
                cancellationToken);

        if (vehicle is null)
        {
            throw new ServiceAppointmentValidationException("Selected vehicle was not found for this customer.");
        }

        return vehicle;
    }

    private static void ValidateCreateRequest(CreateServiceAppointmentRequest request)
    {
        var serviceType = request.ServiceType.Trim();
        if (string.Equals(serviceType, "Other", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(request.CustomServiceType))
        {
            throw new ServiceAppointmentValidationException("Enter the custom service type when selecting Other.");
        }

        var preferredDate = request.PreferredDate.Date;
        var today = DateTime.Now.Date;

        if (preferredDate < today)
        {
            throw new ServiceAppointmentValidationException("Preferred date cannot be in the past.");
        }

        if (preferredDate == today
            && TryGetSlotEndTime(request.PreferredTimeSlot, out var slotEndTime)
            && slotEndTime <= DateTime.Now.TimeOfDay)
        {
            throw new ServiceAppointmentValidationException("Selected time slot has already ended. Choose a later slot.");
        }
    }

    private static bool TryGetSlotEndTime(string preferredTimeSlot, out TimeSpan endTime)
    {
        endTime = default;

        var parts = preferredTimeSlot.Split('-', 2, StringSplitOptions.TrimEntries);
        if (parts.Length != 2)
        {
            return false;
        }

        if (!DateTime.TryParseExact(
            parts[1],
            "hh:mm tt",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var parsedEndTime))
        {
            return false;
        }

        endTime = parsedEndTime.TimeOfDay;
        return true;
    }

    private async Task ApplyAssignedStaffAsync(
        ServiceAppointment appointment,
        int? assignedStaffId,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var actor = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == actorUserId, cancellationToken);

        if (assignedStaffId.HasValue)
        {
            var staffExists = await _db.Users.AnyAsync(
                user => user.Id == assignedStaffId.Value && user.Role == UserRole.Staff,
                cancellationToken);

            if (!staffExists)
            {
                throw new ServiceAppointmentValidationException("Assigned staff account was not found.");
            }

            appointment.AssignedStaffId = assignedStaffId.Value;
            return;
        }

        if (!appointment.AssignedStaffId.HasValue && actor?.Role == UserRole.Staff)
        {
            appointment.AssignedStaffId = actorUserId;
        }
    }

    private static void ApplyStatusUpdate(
        ServiceAppointment appointment,
        UpdateServiceAppointmentStatusRequest request)
    {
        appointment.Status = request.Status;
        appointment.ScheduledStartAt = ToUtcNullableDateTime(request.ScheduledStartAt);
        appointment.ScheduledEndAt = ToUtcNullableDateTime(request.ScheduledEndAt);
        appointment.StaffNote = request.StaffNote.Trim();
        appointment.DiagnosisNote = request.DiagnosisNote.Trim();
        appointment.CompletionNote = request.CompletionNote.Trim();
        appointment.UpdatedAt = DateTime.UtcNow;

        if (request.Status == ServiceAppointmentStatus.Confirmed)
        {
            appointment.ConfirmedAt ??= DateTime.UtcNow;
        }

        if (request.Status == ServiceAppointmentStatus.InProgress)
        {
            appointment.StartedAt ??= DateTime.UtcNow;
            appointment.ConfirmedAt ??= DateTime.UtcNow;
        }

        if (request.Status == ServiceAppointmentStatus.Completed)
        {
            appointment.CompletedAt ??= DateTime.UtcNow;
            appointment.StartedAt ??= DateTime.UtcNow;
            appointment.ConfirmedAt ??= DateTime.UtcNow;
        }

        if (request.Status is ServiceAppointmentStatus.Cancelled or ServiceAppointmentStatus.Rejected)
        {
            appointment.CancelledAt ??= DateTime.UtcNow;
            appointment.CancelledByRole = nameof(UserRole.Staff);
            appointment.CancellationReason = request.CancellationReason.Trim();
        }
    }

    private async Task NotifyStaffAndAdminsAsync(
        string type,
        string title,
        string message,
        string linkUrl,
        int appointmentId,
        CancellationToken cancellationToken)
    {
        await _notifications.CreateForRoleAsync(
            UserRole.Staff,
            type,
            title,
            message,
            linkUrl,
            nameof(ServiceAppointment),
            appointmentId,
            cancellationToken);

        await _notifications.CreateForRoleAsync(
            UserRole.Admin,
            type,
            title,
            message,
            "/admin",
            nameof(ServiceAppointment),
            appointmentId,
            cancellationToken);
    }

    private async Task<string> GenerateAppointmentNumberAsync(CancellationToken cancellationToken)
    {
        var datePrefix = $"SA-{DateTime.UtcNow:yyyyMMdd}";
        var count = await _db.ServiceAppointments.CountAsync(
            appointment => appointment.AppointmentNumber.StartsWith(datePrefix),
            cancellationToken);

        return $"{datePrefix}-{count + 1:000}";
    }

    private async Task<IReadOnlyCollection<ServiceAppointmentResponse>> ToResponsesAsync(
        IReadOnlyCollection<ServiceAppointment> appointments,
        CancellationToken cancellationToken)
    {
        var customerIds = appointments
            .Select(appointment => appointment.CustomerId)
            .Distinct()
            .ToArray();
        var creditBalances = await _db.CustomerCreditAccounts
            .AsNoTracking()
            .Where(account => customerIds.Contains(account.CustomerId))
            .ToDictionaryAsync(account => account.CustomerId, account => account.Balance, cancellationToken);

        return appointments
            .Select(appointment => ToResponse(
                appointment,
                creditBalances.TryGetValue(appointment.CustomerId, out var balance) ? balance : 0m))
            .ToArray();
    }

    private async Task<ServiceAppointmentResponse> ToResponseAsync(
        ServiceAppointment appointment,
        CancellationToken cancellationToken)
    {
        var creditBalance = await _db.CustomerCreditAccounts
            .AsNoTracking()
            .Where(account => account.CustomerId == appointment.CustomerId)
            .Select(account => account.Balance)
            .FirstOrDefaultAsync(cancellationToken);

        return ToResponse(appointment, creditBalance);
    }

    private static ServiceAppointmentResponse ToResponse(ServiceAppointment appointment, decimal customerCreditBalance)
    {
        return new ServiceAppointmentResponse(
            appointment.ServiceAppointmentId,
            appointment.AppointmentNumber,
            appointment.CustomerId,
            GetUserDisplayName(appointment.Customer),
            appointment.Customer?.Email ?? string.Empty,
            appointment.Customer?.Phone ?? string.Empty,
            appointment.VehicleId,
            GetVehicleLabel(appointment.Vehicle),
            appointment.Vehicle?.VehicleNumber ?? string.Empty,
            appointment.Vehicle?.Make ?? string.Empty,
            appointment.Vehicle?.Model ?? string.Empty,
            appointment.AssignedStaffId,
            GetUserDisplayName(appointment.AssignedStaff),
            appointment.ServiceType,
            appointment.CustomServiceType,
            GetDisplayServiceType(appointment),
            appointment.Urgency,
            appointment.Status,
            appointment.PreferredDate,
            appointment.PreferredTimeSlot,
            appointment.ScheduledStartAt,
            appointment.ScheduledEndAt,
            appointment.MileageAtBooking,
            appointment.ProblemDescription,
            appointment.CustomerNote,
            appointment.StaffNote,
            appointment.DiagnosisNote,
            appointment.CompletionNote,
            appointment.CancelledByRole,
            appointment.CancellationReason,
            appointment.CreatedAt,
            appointment.UpdatedAt,
            appointment.ConfirmedAt,
            appointment.StartedAt,
            appointment.CompletedAt,
            appointment.CancelledAt,
            customerCreditBalance,
            appointment.BookingInvoice is not null);
    }

    private static string GetDisplayServiceType(ServiceAppointment appointment)
    {
        return string.Equals(appointment.ServiceType, "Other", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(appointment.CustomServiceType)
            ? appointment.CustomServiceType
            : appointment.ServiceType;
    }

    private static string GetUserDisplayName(User? user)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        return user?.Email ?? string.Empty;
    }

    private static string GetVehicleLabel(CustomerVehicle? vehicle)
    {
        if (vehicle is null)
        {
            return string.Empty;
        }

        return $"{vehicle.VehicleNumber} - {vehicle.Make} {vehicle.Model}".Trim();
    }

    private static string FormatStatus(ServiceAppointmentStatus status)
    {
        return status switch
        {
            ServiceAppointmentStatus.InProgress => "in progress",
            ServiceAppointmentStatus.NoShow => "marked as no-show",
            _ => status.ToString().ToLowerInvariant()
        };
    }

    private static DateTime ToUtcDateTime(DateTime value)
    {
        return value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static DateTime? ToUtcNullableDateTime(DateTime? value)
    {
        return value.HasValue ? ToUtcDateTime(value.Value) : null;
    }
}
