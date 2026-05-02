using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.PartRequests;
using Servers.Models;

namespace Servers.Services;

public interface IPartRequestService
{
    Task<IReadOnlyCollection<PartRequestResponse>> GetMyRequestsAsync(
        int customerId,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<PartRequestResponse>> GetRequestsAsync(
        string? query,
        PartRequestStatus? status,
        CancellationToken cancellationToken);

    Task<PartRequestResponse> CreateRequestAsync(
        int customerId,
        CreatePartRequestRequest request,
        CancellationToken cancellationToken);

    Task<PartRequestResponse?> UpdateStatusAsync(
        int partRequestId,
        UpdatePartRequestStatusRequest request,
        int actorUserId,
        CancellationToken cancellationToken);

    Task<bool> CancelMyRequestAsync(
        int partRequestId,
        int customerId,
        CancellationToken cancellationToken);
}

public sealed class PartRequestValidationException : Exception
{
    public PartRequestValidationException(string message)
        : base(message)
    {
    }
}

public sealed class PartRequestService : IPartRequestService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public PartRequestService(AppDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<IReadOnlyCollection<PartRequestResponse>> GetMyRequestsAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var requests = await QueryRequests()
            .AsNoTracking()
            .Where(request => request.CustomerId == customerId)
            .OrderByDescending(request => request.CreatedAt)
            .ToArrayAsync(cancellationToken);

        return requests.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<PartRequestResponse>> GetRequestsAsync(
        string? query,
        PartRequestStatus? status,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var requestsQuery = QueryRequests().AsNoTracking();

        if (status.HasValue)
        {
            requestsQuery = requestsQuery.Where(request => request.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            requestsQuery = requestsQuery.Where(request =>
                request.PartName.ToLower().Contains(normalizedQuery)
                || request.PartNumber.ToLower().Contains(normalizedQuery)
                || request.Customer.FullName.ToLower().Contains(normalizedQuery)
                || request.Customer.Email.ToLower().Contains(normalizedQuery)
                || request.Customer.Phone.ToLower().Contains(normalizedQuery)
                || request.PartRequestId.ToString().Contains(normalizedQuery)
                || (request.Vehicle != null && request.Vehicle.VehicleNumber.ToLower().Contains(normalizedQuery)));
        }

        var requests = await requestsQuery
            .OrderByDescending(request => request.CreatedAt)
            .Take(100)
            .ToArrayAsync(cancellationToken);

        return requests.Select(ToResponse).ToArray();
    }

    public async Task<PartRequestResponse> CreateRequestAsync(
        int customerId,
        CreatePartRequestRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureCustomerExistsAsync(customerId, cancellationToken);
        await EnsureVehicleBelongsToCustomerAsync(customerId, request.VehicleId, cancellationToken);

        Part? selectedPart = null;
        if (request.RequestedPartId.HasValue)
        {
            selectedPart = await _db.Parts
                .AsNoTracking()
                .Include(part => part.Details)
                .FirstOrDefaultAsync(part =>
                    part.PartId == request.RequestedPartId.Value
                    && part.IsActive,
                    cancellationToken);

            if (selectedPart is null)
            {
                throw new PartRequestValidationException("Selected part was not found.");
            }
        }

        var partName = selectedPart?.Name ?? request.PartName.Trim();
        var partNumber = selectedPart?.PartNumber ?? request.PartNumber.Trim().ToUpperInvariant();
        var description = selectedPart?.Details?.Description ?? request.Description.Trim();

        if (string.IsNullOrWhiteSpace(partName))
        {
            throw new PartRequestValidationException("Part name is required for custom part requests.");
        }

        if (selectedPart is null && string.IsNullOrWhiteSpace(description))
        {
            throw new PartRequestValidationException("Description is required for custom part requests.");
        }

        var partRequest = new PartRequest
        {
            CustomerId = customerId,
            VehicleId = request.VehicleId,
            RequestedPartId = selectedPart?.PartId,
            PartName = partName,
            PartNumber = partNumber,
            Description = description,
            Quantity = request.Quantity,
            Urgency = request.Urgency,
            Status = PartRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _db.PartRequests.Add(partRequest);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForRoleAsync(
            UserRole.Staff,
            "PartRequestCreated",
            "New part request",
            $"{partName} x{request.Quantity} was requested by a customer.",
            "/staff/part-requests",
            nameof(PartRequest),
            partRequest.PartRequestId,
            cancellationToken);

        var createdRequest = await GetRequestWithDetailsAsync(partRequest.PartRequestId, cancellationToken);
        return ToResponse(createdRequest ?? partRequest);
    }

    public async Task<PartRequestResponse?> UpdateStatusAsync(
        int partRequestId,
        UpdatePartRequestStatusRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var partRequest = await QueryRequests()
            .FirstOrDefaultAsync(current => current.PartRequestId == partRequestId, cancellationToken);

        if (partRequest is null)
        {
            return null;
        }

        if (NormalizeStatus(partRequest.Status) is PartRequestStatus.Cancelled or PartRequestStatus.Invoiced)
        {
            throw new PartRequestValidationException("This request is already closed.");
        }

        partRequest.Status = request.Status;
        partRequest.StaffNote = request.StaffNote.Trim();
        partRequest.UpdatedAt = DateTime.UtcNow;

        if (request.Status is PartRequestStatus.Available
            or PartRequestStatus.Unavailable
            or PartRequestStatus.Rejected
            or PartRequestStatus.Invoiced)
        {
            partRequest.ResolvedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForUserAsync(
            partRequest.CustomerId,
            "PartRequestUpdated",
            "Part request updated",
            $"Your request for {partRequest.PartName} is now {FormatStatus(NormalizeStatus(partRequest.Status))}.",
            "/customer/part-requests",
            nameof(PartRequest),
            partRequest.PartRequestId,
            cancellationToken);

        var updatedRequest = await GetRequestWithDetailsAsync(partRequest.PartRequestId, cancellationToken);
        return ToResponse(updatedRequest ?? partRequest);
    }

    public async Task<bool> CancelMyRequestAsync(
        int partRequestId,
        int customerId,
        CancellationToken cancellationToken)
    {
        var partRequest = await _db.PartRequests
            .FirstOrDefaultAsync(request =>
                request.PartRequestId == partRequestId
                && request.CustomerId == customerId,
                cancellationToken);

        if (partRequest is null)
        {
            return false;
        }

        if (partRequest.Status != PartRequestStatus.Pending)
        {
            throw new PartRequestValidationException("Only pending requests can be cancelled.");
        }

        partRequest.Status = PartRequestStatus.Cancelled;
        partRequest.UpdatedAt = DateTime.UtcNow;
        partRequest.ResolvedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<PartRequest> QueryRequests()
    {
        return _db.PartRequests
            .Include(request => request.Customer)
            .Include(request => request.Vehicle)
            .Include(request => request.RequestedPart);
    }

    private Task<PartRequest?> GetRequestWithDetailsAsync(
        int partRequestId,
        CancellationToken cancellationToken)
    {
        return QueryRequests()
            .AsNoTracking()
            .FirstOrDefaultAsync(request => request.PartRequestId == partRequestId, cancellationToken);
    }

    private async Task EnsureCustomerExistsAsync(int customerId, CancellationToken cancellationToken)
    {
        var exists = await _db.Users.AnyAsync(
            user => user.Id == customerId && user.Role == UserRole.Customer,
            cancellationToken);

        if (!exists)
        {
            throw new PartRequestValidationException("Customer account was not found.");
        }
    }

    private async Task EnsureVehicleBelongsToCustomerAsync(
        int customerId,
        int? vehicleId,
        CancellationToken cancellationToken)
    {
        if (!vehicleId.HasValue)
        {
            return;
        }

        var exists = await _db.CustomerVehicles.AnyAsync(
            vehicle =>
                vehicle.CustomerVehicleId == vehicleId.Value
                && vehicle.CustomerId == customerId
                && vehicle.IsActive,
            cancellationToken);

        if (!exists)
        {
            throw new PartRequestValidationException("Selected vehicle was not found for this customer.");
        }
    }

    private static PartRequestResponse ToResponse(PartRequest request)
    {
        return new PartRequestResponse(
            request.PartRequestId,
            request.CustomerId,
            GetUserDisplayName(request.Customer),
            request.Customer?.Email ?? string.Empty,
            request.Customer?.Phone ?? string.Empty,
            request.VehicleId,
            GetVehicleLabel(request.Vehicle),
            request.RequestedPartId,
            request.PartName,
            request.PartNumber,
            request.Description,
            request.Quantity,
            request.Urgency,
            NormalizeStatus(request.Status),
            request.StaffNote,
            request.CreatedAt,
            request.UpdatedAt,
            request.ResolvedAt);
    }

    private static string GetUserDisplayName(User? user)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        return user is null ? string.Empty : $"Customer #{user.Id}";
    }

    private static PartRequestStatus NormalizeStatus(PartRequestStatus status)
    {
        return status == PartRequestStatus.ConvertedToInvoice
            ? PartRequestStatus.Invoiced
            : status;
    }

    private static string FormatStatus(PartRequestStatus status)
    {
        return status == PartRequestStatus.Invoiced ? "Invoice created" : status.ToString();
    }

    private static string GetVehicleLabel(CustomerVehicle? vehicle)
    {
        if (vehicle is null)
        {
            return string.Empty;
        }

        return $"{vehicle.VehicleNumber} - {vehicle.Make} {vehicle.Model}";
    }
}
