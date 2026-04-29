namespace Servers.Models;

public sealed class Part
{
    public int PartId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public string Brand { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public decimal SellingPrice { get; set; }

    public int QuantityInStock { get; set; }

    public int ReorderLevel { get; set; } = 10;

    public bool IsActive { get; set; } = true;

    public int? CreatedByUserId { get; set; }

    public int? UpdatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public PartDetails? Details { get; set; }

    public User? CreatedByUser { get; set; }

    public User? UpdatedByUser { get; set; }
}
