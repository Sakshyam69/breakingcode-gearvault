using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.CustomerVehicles;
using Servers.Models;

namespace Servers.Services;

public interface ICustomerVehicleService
{
    Task<IReadOnlyCollection<CustomerVehicleResponse>> GetMyVehiclesAsync(int customerId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CustomerVehicleResponse>> GetCustomerVehiclesAsync(int customerId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CustomerVehicleResponse>> SearchVehiclesAsync(string? query, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<CustomerVehicleOwnerResponse>> SearchCustomersAsync(string? query, CancellationToken cancellationToken);

    Task<CustomerVehicleResponse> CreateVehicleAsync(
        int customerId,
        CreateCustomerVehicleRequest request,
        int actorUserId,
        CancellationToken cancellationToken);

    Task<CustomerVehicleResponse?> UpdateVehicleAsync(
        int vehicleId,
        UpdateCustomerVehicleRequest request,
        int actorUserId,
        int? requiredCustomerId,
        CancellationToken cancellationToken);

    Task<bool> DeleteVehicleAsync(
        int vehicleId,
        int actorUserId,
        int? requiredCustomerId,
        CancellationToken cancellationToken);
}

public sealed class CustomerVehicleValidationException : Exception
{
    public CustomerVehicleValidationException(string message)
        : base(message)
    {
    }
}

public sealed class CustomerVehicleService : ICustomerVehicleService
{
    private readonly AppDbContext _db;

    public CustomerVehicleService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<CustomerVehicleResponse>> GetMyVehiclesAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var vehicles = await QueryVehicles()
            .AsNoTracking()
            .Where(vehicle => vehicle.CustomerId == customerId && vehicle.IsActive)
            .OrderByDescending(vehicle => vehicle.IsPrimary)
            .ThenBy(vehicle => vehicle.VehicleNumber)
            .ToArrayAsync(cancellationToken);

        return vehicles.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<CustomerVehicleResponse>> GetCustomerVehiclesAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        await EnsureCustomerExistsAsync(customerId, cancellationToken);
        return await GetMyVehiclesAsync(customerId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<CustomerVehicleResponse>> SearchVehiclesAsync(
        string? query,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var vehiclesQuery = QueryVehicles()
            .AsNoTracking()
            .Where(vehicle => vehicle.IsActive);

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            vehiclesQuery = vehiclesQuery.Where(vehicle =>
                vehicle.VehicleNumber.ToLower().Contains(normalizedQuery)
                || vehicle.Make.ToLower().Contains(normalizedQuery)
                || vehicle.Model.ToLower().Contains(normalizedQuery)
                || vehicle.Customer.FullName.ToLower().Contains(normalizedQuery)
                || vehicle.Customer.Email.ToLower().Contains(normalizedQuery)
                || vehicle.Customer.Phone.ToLower().Contains(normalizedQuery)
                || vehicle.CustomerId.ToString().Contains(normalizedQuery));
        }

        var vehicles = await vehiclesQuery
            .OrderBy(vehicle => vehicle.Customer.FullName)
            .ThenByDescending(vehicle => vehicle.IsPrimary)
            .ThenBy(vehicle => vehicle.VehicleNumber)
            .Take(80)
            .ToArrayAsync(cancellationToken);

        return vehicles.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<CustomerVehicleOwnerResponse>> SearchCustomersAsync(
        string? query,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var customersQuery = _db.Users
            .AsNoTracking()
            .Where(user => user.Role == UserRole.Customer);

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            customersQuery = customersQuery.Where(user =>
                user.FullName.ToLower().Contains(normalizedQuery)
                || user.Email.ToLower().Contains(normalizedQuery)
                || user.Phone.ToLower().Contains(normalizedQuery)
                || user.Id.ToString().Contains(normalizedQuery));
        }

        var customers = await customersQuery
            .OrderBy(user => user.FullName)
            .Take(50)
            .Select(user => new CustomerVehicleOwnerResponse(
                user.Id,
                user.FullName,
                user.Email,
                user.Phone,
                _db.CustomerVehicles.Count(vehicle => vehicle.CustomerId == user.Id && vehicle.IsActive),
                _db.CustomerCreditAccounts
                    .Where(account => account.CustomerId == user.Id)
                    .Select(account => account.Balance)
                    .FirstOrDefault()))
            .ToArrayAsync(cancellationToken);

        return customers;
    }

    public async Task<CustomerVehicleResponse> CreateVehicleAsync(
        int customerId,
        CreateCustomerVehicleRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        await EnsureCustomerExistsAsync(customerId, cancellationToken);
        var vehicleNumber = NormalizeVehicleNumber(request.VehicleNumber);
        await EnsureVehicleNumberIsAvailableAsync(vehicleNumber, null, cancellationToken);

        var hasActiveVehicle = await _db.CustomerVehicles.AnyAsync(
            vehicle => vehicle.CustomerId == customerId && vehicle.IsActive,
            cancellationToken);

        var vehicle = new CustomerVehicle
        {
            CustomerId = customerId,
            VehicleNumber = vehicleNumber,
            CreatedByUserId = actorUserId,
            CreatedAt = DateTime.UtcNow,
            IsPrimary = request.IsPrimary || !hasActiveVehicle
        };

        ApplyVehicleFields(vehicle, request);

        if (vehicle.IsPrimary)
        {
            await ClearPrimaryVehicleAsync(customerId, null, cancellationToken);
        }

        _db.CustomerVehicles.Add(vehicle);
        await _db.SaveChangesAsync(cancellationToken);

        var createdVehicle = await GetVehicleWithDetailsAsync(vehicle.CustomerVehicleId, cancellationToken);
        return ToResponse(createdVehicle ?? vehicle);
    }

    public async Task<CustomerVehicleResponse?> UpdateVehicleAsync(
        int vehicleId,
        UpdateCustomerVehicleRequest request,
        int actorUserId,
        int? requiredCustomerId,
        CancellationToken cancellationToken)
    {
        var vehicle = await _db.CustomerVehicles
            .FirstOrDefaultAsync(current => current.CustomerVehicleId == vehicleId, cancellationToken);

        if (vehicle is null || (requiredCustomerId.HasValue && vehicle.CustomerId != requiredCustomerId.Value))
        {
            return null;
        }

        var vehicleNumber = NormalizeVehicleNumber(request.VehicleNumber);
        await EnsureVehicleNumberIsAvailableAsync(vehicleNumber, vehicleId, cancellationToken);

        vehicle.VehicleNumber = vehicleNumber;
        vehicle.IsPrimary = request.IsPrimary;
        vehicle.IsActive = request.IsActive;
        vehicle.UpdatedByUserId = actorUserId;
        vehicle.UpdatedAt = DateTime.UtcNow;

        ApplyVehicleFields(vehicle, request);

        if (vehicle.IsPrimary && vehicle.IsActive)
        {
            await ClearPrimaryVehicleAsync(vehicle.CustomerId, vehicle.CustomerVehicleId, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
        await EnsureCustomerHasPrimaryVehicleAsync(vehicle.CustomerId, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        var updatedVehicle = await GetVehicleWithDetailsAsync(vehicle.CustomerVehicleId, cancellationToken);
        return updatedVehicle is null ? null : ToResponse(updatedVehicle);
    }

    public async Task<bool> DeleteVehicleAsync(
        int vehicleId,
        int actorUserId,
        int? requiredCustomerId,
        CancellationToken cancellationToken)
    {
        var vehicle = await _db.CustomerVehicles
            .FirstOrDefaultAsync(current =>
                current.CustomerVehicleId == vehicleId
                && current.IsActive
                && (!requiredCustomerId.HasValue || current.CustomerId == requiredCustomerId.Value),
                cancellationToken);

        if (vehicle is null)
        {
            return false;
        }

        vehicle.IsActive = false;
        vehicle.IsPrimary = false;
        vehicle.UpdatedByUserId = actorUserId;
        vehicle.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        await EnsureCustomerHasPrimaryVehicleAsync(vehicle.CustomerId, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }

    private IQueryable<CustomerVehicle> QueryVehicles()
    {
        return _db.CustomerVehicles
            .Include(vehicle => vehicle.Customer)
            .Include(vehicle => vehicle.CreatedByUser)
            .Include(vehicle => vehicle.UpdatedByUser);
    }

    private async Task EnsureCustomerExistsAsync(int customerId, CancellationToken cancellationToken)
    {
        var exists = await _db.Users.AnyAsync(
            user => user.Id == customerId && user.Role == UserRole.Customer,
            cancellationToken);

        if (!exists)
        {
            throw new CustomerVehicleValidationException("Selected customer was not found.");
        }
    }

    private async Task EnsureVehicleNumberIsAvailableAsync(
        string vehicleNumber,
        int? currentVehicleId,
        CancellationToken cancellationToken)
    {
        var exists = await _db.CustomerVehicles.AnyAsync(vehicle =>
            vehicle.VehicleNumber == vehicleNumber
            && (!currentVehicleId.HasValue || vehicle.CustomerVehicleId != currentVehicleId.Value),
            cancellationToken);

        if (exists)
        {
            throw new CustomerVehicleValidationException($"Vehicle number '{vehicleNumber}' is already registered.");
        }
    }

    private async Task ClearPrimaryVehicleAsync(
        int customerId,
        int? exceptVehicleId,
        CancellationToken cancellationToken)
    {
        var vehicles = await _db.CustomerVehicles
            .Where(vehicle =>
                vehicle.CustomerId == customerId
                && vehicle.IsPrimary
                && vehicle.IsActive
                && (!exceptVehicleId.HasValue || vehicle.CustomerVehicleId != exceptVehicleId.Value))
            .ToArrayAsync(cancellationToken);

        foreach (var vehicle in vehicles)
        {
            vehicle.IsPrimary = false;
        }
    }

    private async Task EnsureCustomerHasPrimaryVehicleAsync(int customerId, CancellationToken cancellationToken)
    {
        var hasPrimary = await _db.CustomerVehicles.AnyAsync(
            vehicle => vehicle.CustomerId == customerId && vehicle.IsActive && vehicle.IsPrimary,
            cancellationToken);

        if (hasPrimary)
        {
            return;
        }

        var firstVehicle = await _db.CustomerVehicles
            .Where(vehicle => vehicle.CustomerId == customerId && vehicle.IsActive)
            .OrderBy(vehicle => vehicle.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (firstVehicle is not null)
        {
            firstVehicle.IsPrimary = true;
        }
    }

    private Task<CustomerVehicle?> GetVehicleWithDetailsAsync(int vehicleId, CancellationToken cancellationToken)
    {
        return QueryVehicles()
            .AsNoTracking()
            .FirstOrDefaultAsync(vehicle => vehicle.CustomerVehicleId == vehicleId, cancellationToken);
    }

    private static void ApplyVehicleFields(CustomerVehicle vehicle, CreateCustomerVehicleRequest request)
    {
        vehicle.Make = request.Make.Trim();
        vehicle.Model = request.Model.Trim();
        vehicle.Year = request.Year.Trim();
        vehicle.Color = request.Color.Trim();
        vehicle.FuelType = request.FuelType.Trim();
        vehicle.ImageUrl = request.ImageUrl.Trim();
        vehicle.EngineNumber = request.EngineNumber.Trim();
        vehicle.ChassisNumber = request.ChassisNumber.Trim();
        vehicle.Mileage = request.Mileage;
        vehicle.Notes = request.Notes.Trim();
    }

    private static string NormalizeVehicleNumber(string vehicleNumber)
    {
        return vehicleNumber.Trim().ToUpperInvariant();
    }

    private static CustomerVehicleResponse ToResponse(CustomerVehicle vehicle)
    {
        return new CustomerVehicleResponse(
            vehicle.CustomerVehicleId,
            vehicle.CustomerId,
            GetUserDisplayName(vehicle.Customer),
            vehicle.Customer?.Email ?? string.Empty,
            vehicle.Customer?.Phone ?? string.Empty,
            vehicle.VehicleNumber,
            vehicle.Make,
            vehicle.Model,
            vehicle.Year,
            vehicle.Color,
            vehicle.FuelType,
            vehicle.ImageUrl,
            vehicle.EngineNumber,
            vehicle.ChassisNumber,
            vehicle.Mileage,
            vehicle.IsPrimary,
            vehicle.IsActive,
            vehicle.CreatedByUserId,
            vehicle.UpdatedByUserId,
            GetUserDisplayName(vehicle.CreatedByUser),
            vehicle.CreatedByUser?.Email ?? string.Empty,
            GetUserRole(vehicle.CreatedByUser),
            GetUserDisplayName(vehicle.UpdatedByUser),
            vehicle.UpdatedByUser?.Email ?? string.Empty,
            GetUserRole(vehicle.UpdatedByUser),
            vehicle.CreatedAt,
            vehicle.UpdatedAt,
            vehicle.Notes);
    }

    private static string GetUserDisplayName(User? user)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        return string.Empty;
    }

    private static string GetUserRole(User? user)
    {
        return user is null ? string.Empty : user.Role.ToString();
    }
}
