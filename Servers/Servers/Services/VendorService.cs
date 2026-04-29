using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.Vendors;
using Servers.Models;

namespace Servers.Services;

public interface IVendorService
{
    Task<IReadOnlyCollection<VendorResponse>> GetVendorsAsync(CancellationToken cancellationToken);

    Task<VendorResponse?> GetVendorAsync(int vendorId, CancellationToken cancellationToken);

    Task<VendorResponse> CreateVendorAsync(
        CreateVendorRequest request,
        int userId,
        CancellationToken cancellationToken);

    Task<VendorResponse?> UpdateVendorAsync(
        int vendorId,
        UpdateVendorRequest request,
        int userId,
        CancellationToken cancellationToken);

    Task<bool> DeleteVendorAsync(int vendorId, int userId, CancellationToken cancellationToken);
}

public sealed class VendorService : IVendorService
{
    private readonly AppDbContext _db;

    public VendorService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<VendorResponse>> GetVendorsAsync(CancellationToken cancellationToken)
    {
        var vendors = await _db.Vendors
            .AsNoTracking()
            .Include(vendor => vendor.Details)
            .Include(vendor => vendor.CreatedByUser)
            .Include(vendor => vendor.UpdatedByUser)
            .Where(vendor => vendor.IsActive)
            .OrderBy(vendor => vendor.Name)
            .ToArrayAsync(cancellationToken);

        return vendors.Select(ToResponse).ToArray();
    }

    public async Task<VendorResponse?> GetVendorAsync(int vendorId, CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors
            .AsNoTracking()
            .Include(current => current.Details)
            .Include(current => current.CreatedByUser)
            .Include(current => current.UpdatedByUser)
            .FirstOrDefaultAsync(current => current.VendorId == vendorId && current.IsActive, cancellationToken);

        return vendor is null ? null : ToResponse(vendor);
    }

    public async Task<VendorResponse> CreateVendorAsync(
        CreateVendorRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        var vendor = new Vendor
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            Details = new VendorDetails()
        };

        ApplyDetails(vendor.Details, request);

        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync(cancellationToken);

        var createdVendor = await GetVendorWithDetailsAsync(vendor.VendorId, cancellationToken);
        return ToResponse(createdVendor ?? vendor);
    }

    public async Task<VendorResponse?> UpdateVendorAsync(
        int vendorId,
        UpdateVendorRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors
            .Include(current => current.Details)
            .FirstOrDefaultAsync(current => current.VendorId == vendorId, cancellationToken);

        if (vendor is null)
        {
            return null;
        }

        vendor.Name = request.Name.Trim();
        vendor.Email = request.Email.Trim().ToLowerInvariant();
        vendor.Phone = request.Phone.Trim();
        vendor.IsActive = request.IsActive;
        vendor.UpdatedByUserId = userId;
        vendor.UpdatedAt = DateTime.UtcNow;

        vendor.Details ??= new VendorDetails
        {
            VendorId = vendor.VendorId
        };

        ApplyDetails(vendor.Details, request);

        await _db.SaveChangesAsync(cancellationToken);

        var updatedVendor = await GetVendorWithDetailsAsync(vendor.VendorId, cancellationToken);
        return ToResponse(updatedVendor ?? vendor);
    }

    public async Task<bool> DeleteVendorAsync(int vendorId, int userId, CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors
            .FirstOrDefaultAsync(current => current.VendorId == vendorId && current.IsActive, cancellationToken);

        if (vendor is null)
        {
            return false;
        }

        vendor.IsActive = false;
        vendor.UpdatedByUserId = userId;
        vendor.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ApplyDetails(VendorDetails details, CreateVendorRequest request)
    {
        details.ContactPerson = request.ContactPerson.Trim();
        details.Address = request.Address.Trim();
        details.City = request.City.Trim();
        details.Country = request.Country.Trim();
        details.TaxNumber = request.TaxNumber.Trim();
        details.PaymentTerms = request.PaymentTerms.Trim();
        details.BankName = request.BankName.Trim();
        details.BankAccountNumber = request.BankAccountNumber.Trim();
        details.Notes = request.Notes.Trim();
    }

    private Task<Vendor?> GetVendorWithDetailsAsync(int vendorId, CancellationToken cancellationToken)
    {
        return _db.Vendors
            .AsNoTracking()
            .Include(vendor => vendor.Details)
            .Include(vendor => vendor.CreatedByUser)
            .Include(vendor => vendor.UpdatedByUser)
            .FirstOrDefaultAsync(vendor => vendor.VendorId == vendorId, cancellationToken);
    }

    private static VendorResponse ToResponse(Vendor vendor)
    {
        var details = vendor.Details ?? new VendorDetails();

        return new VendorResponse(
            vendor.VendorId,
            vendor.Name,
            vendor.Email,
            vendor.Phone,
            vendor.IsActive,
            vendor.CreatedByUserId,
            vendor.UpdatedByUserId,
            GetUserDisplayName(vendor.CreatedByUser, vendor.CreatedByUserId),
            vendor.CreatedByUser?.Email ?? string.Empty,
            GetUserRole(vendor.CreatedByUser),
            GetUserDisplayName(vendor.UpdatedByUser, vendor.UpdatedByUserId),
            vendor.UpdatedByUser?.Email ?? string.Empty,
            GetUserRole(vendor.UpdatedByUser),
            vendor.CreatedAt,
            vendor.UpdatedAt,
            new VendorDetailsResponse(
                details.VendorDetailsId,
                details.ContactPerson,
                details.Address,
                details.City,
                details.Country,
                details.TaxNumber,
                details.PaymentTerms,
                details.BankName,
                details.BankAccountNumber,
                details.Notes));
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
