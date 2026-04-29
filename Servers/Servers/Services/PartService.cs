using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.Parts;
using Servers.Models;

namespace Servers.Services;

public interface IPartService
{
    Task<IReadOnlyCollection<PartResponse>> GetPartsAsync(CancellationToken cancellationToken);

    Task<PartResponse?> GetPartAsync(int partId, CancellationToken cancellationToken);

    Task<PartResponse> CreatePartAsync(
        CreatePartRequest request,
        int userId,
        CancellationToken cancellationToken);

    Task<PartResponse?> UpdatePartAsync(
        int partId,
        UpdatePartRequest request,
        int userId,
        CancellationToken cancellationToken);

    Task<bool> DeletePartAsync(int partId, int userId, CancellationToken cancellationToken);
}

public sealed class DuplicatePartNumberException : Exception
{
    public DuplicatePartNumberException(string partNumber)
        : base($"Part number '{partNumber}' is already in use.")
    {
    }
}

public sealed class PartService : IPartService
{
    private readonly AppDbContext _db;

    public PartService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<PartResponse>> GetPartsAsync(CancellationToken cancellationToken)
    {
        var parts = await _db.Parts
            .AsNoTracking()
            .Include(part => part.Details)
            .Include(part => part.CreatedByUser)
            .Include(part => part.UpdatedByUser)
            .Where(part => part.IsActive)
            .OrderBy(part => part.Name)
            .ToArrayAsync(cancellationToken);

        return parts.Select(ToResponse).ToArray();
    }

    public async Task<PartResponse?> GetPartAsync(int partId, CancellationToken cancellationToken)
    {
        var part = await _db.Parts
            .AsNoTracking()
            .Include(current => current.Details)
            .Include(current => current.CreatedByUser)
            .Include(current => current.UpdatedByUser)
            .FirstOrDefaultAsync(current => current.PartId == partId && current.IsActive, cancellationToken);

        return part is null ? null : ToResponse(part);
    }

    public async Task<PartResponse> CreatePartAsync(
        CreatePartRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        var partNumber = NormalizePartNumber(request.PartNumber);
        await EnsurePartNumberIsAvailableAsync(partNumber, null, cancellationToken);

        var part = new Part
        {
            Name = request.Name.Trim(),
            PartNumber = partNumber,
            Brand = request.Brand.Trim(),
            Category = request.Category.Trim(),
            SellingPrice = request.SellingPrice,
            QuantityInStock = request.QuantityInStock,
            ReorderLevel = request.ReorderLevel,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            Details = new PartDetails()
        };

        ApplyDetails(part.Details, request);

        _db.Parts.Add(part);
        await _db.SaveChangesAsync(cancellationToken);

        var createdPart = await GetPartWithDetailsAsync(part.PartId, cancellationToken);
        return ToResponse(createdPart ?? part);
    }

    public async Task<PartResponse?> UpdatePartAsync(
        int partId,
        UpdatePartRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        var part = await _db.Parts
            .Include(current => current.Details)
            .FirstOrDefaultAsync(current => current.PartId == partId, cancellationToken);

        if (part is null)
        {
            return null;
        }

        var partNumber = NormalizePartNumber(request.PartNumber);
        await EnsurePartNumberIsAvailableAsync(partNumber, partId, cancellationToken);

        part.Name = request.Name.Trim();
        part.PartNumber = partNumber;
        part.Brand = request.Brand.Trim();
        part.Category = request.Category.Trim();
        part.SellingPrice = request.SellingPrice;
        part.QuantityInStock = request.QuantityInStock;
        part.ReorderLevel = request.ReorderLevel;
        part.IsActive = request.IsActive;
        part.UpdatedByUserId = userId;
        part.UpdatedAt = DateTime.UtcNow;

        part.Details ??= new PartDetails
        {
            PartId = part.PartId
        };

        ApplyDetails(part.Details, request);

        await _db.SaveChangesAsync(cancellationToken);

        var updatedPart = await GetPartWithDetailsAsync(part.PartId, cancellationToken);
        return ToResponse(updatedPart ?? part);
    }

    public async Task<bool> DeletePartAsync(int partId, int userId, CancellationToken cancellationToken)
    {
        var part = await _db.Parts
            .FirstOrDefaultAsync(current => current.PartId == partId && current.IsActive, cancellationToken);

        if (part is null)
        {
            return false;
        }

        part.IsActive = false;
        part.UpdatedByUserId = userId;
        part.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ApplyDetails(PartDetails details, CreatePartRequest request)
    {
        details.Description = request.Description.Trim();
        details.VehicleMake = request.VehicleMake.Trim();
        details.VehicleModel = request.VehicleModel.Trim();
        details.VehicleYear = request.VehicleYear.Trim();
        details.CompatibleEngine = request.CompatibleEngine.Trim();
        details.ShelfLocation = request.ShelfLocation.Trim();
        details.WarrantyPeriod = request.WarrantyPeriod.Trim();
        details.Notes = request.Notes.Trim();
    }

    private async Task EnsurePartNumberIsAvailableAsync(
        string partNumber,
        int? currentPartId,
        CancellationToken cancellationToken)
    {
        var exists = await _db.Parts.AnyAsync(part =>
            part.PartNumber == partNumber
            && (!currentPartId.HasValue || part.PartId != currentPartId.Value),
            cancellationToken);

        if (exists)
        {
            throw new DuplicatePartNumberException(partNumber);
        }
    }

    private Task<Part?> GetPartWithDetailsAsync(int partId, CancellationToken cancellationToken)
    {
        return _db.Parts
            .AsNoTracking()
            .Include(part => part.Details)
            .Include(part => part.CreatedByUser)
            .Include(part => part.UpdatedByUser)
            .FirstOrDefaultAsync(part => part.PartId == partId, cancellationToken);
    }

    private static PartResponse ToResponse(Part part)
    {
        var details = part.Details ?? new PartDetails();

        return new PartResponse(
            part.PartId,
            part.Name,
            part.PartNumber,
            part.Brand,
            part.Category,
            part.SellingPrice,
            part.QuantityInStock,
            part.ReorderLevel,
            part.QuantityInStock < part.ReorderLevel,
            part.IsActive,
            part.CreatedByUserId,
            part.UpdatedByUserId,
            GetUserDisplayName(part.CreatedByUser, part.CreatedByUserId),
            part.CreatedByUser?.Email ?? string.Empty,
            GetUserRole(part.CreatedByUser),
            GetUserDisplayName(part.UpdatedByUser, part.UpdatedByUserId),
            part.UpdatedByUser?.Email ?? string.Empty,
            GetUserRole(part.UpdatedByUser),
            part.CreatedAt,
            part.UpdatedAt,
            new PartDetailsResponse(
                details.PartDetailsId,
                details.Description,
                details.VehicleMake,
                details.VehicleModel,
                details.VehicleYear,
                details.CompatibleEngine,
                details.ShelfLocation,
                details.WarrantyPeriod,
                details.Notes));
    }

    private static string NormalizePartNumber(string partNumber)
    {
        return partNumber.Trim().ToUpperInvariant();
    }

    private static string GetUserDisplayName(User? user, int? userId)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        if (!string.IsNullOrWhiteSpace(user?.Email))
        {
            return user.Email;
        }

        return userId.HasValue ? $"User #{userId.Value}" : string.Empty;
    }

    private static string GetUserRole(User? user)
    {
        return user is null ? string.Empty : user.Role.ToString();
    }
}
