namespace Servers.Models;

public sealed class VendorDetails
{
    public int VendorDetailsId { get; set; }

    public int VendorId { get; set; }

    public string ContactPerson { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string Country { get; set; } = "Nepal";

    public string TaxNumber { get; set; } = string.Empty;

    public string PaymentTerms { get; set; } = string.Empty;

    public string BankName { get; set; } = string.Empty;

    public string BankAccountNumber { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public Vendor Vendor { get; set; } = null!;
}
