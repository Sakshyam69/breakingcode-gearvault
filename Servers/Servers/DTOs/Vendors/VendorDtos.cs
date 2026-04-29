using System.ComponentModel.DataAnnotations;

namespace Servers.DTOs.Vendors;

public class CreateVendorRequest
{
    [Required]
    [StringLength(160, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [EmailAddress]
    [StringLength(180)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string Phone { get; set; } = string.Empty;

    [StringLength(120)]
    public string ContactPerson { get; set; } = string.Empty;

    [Required]
    [StringLength(250, MinimumLength = 2)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string City { get; set; } = string.Empty;

    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string Country { get; set; } = "Nepal";

    [StringLength(80)]
    public string TaxNumber { get; set; } = string.Empty;

    [StringLength(120)]
    public string PaymentTerms { get; set; } = string.Empty;

    [StringLength(120)]
    public string BankName { get; set; } = string.Empty;

    [StringLength(80)]
    public string BankAccountNumber { get; set; } = string.Empty;

    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}

public sealed class UpdateVendorRequest : CreateVendorRequest
{
    public bool IsActive { get; set; } = true;
}

public sealed record VendorResponse(
    int VendorId,
    string Name,
    string Email,
    string Phone,
    bool IsActive,
    int? CreatedByUserId,
    int? UpdatedByUserId,
    string CreatedByUserName,
    string CreatedByUserEmail,
    string CreatedByUserRole,
    string UpdatedByUserName,
    string UpdatedByUserEmail,
    string UpdatedByUserRole,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    VendorDetailsResponse Details);

public sealed record VendorDetailsResponse(
    int VendorDetailsId,
    string ContactPerson,
    string Address,
    string City,
    string Country,
    string TaxNumber,
    string PaymentTerms,
    string BankName,
    string BankAccountNumber,
    string Notes);
