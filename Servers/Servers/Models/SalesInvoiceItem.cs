namespace Servers.Models;

public sealed class SalesInvoiceItem
{
    public int SalesInvoiceItemId { get; set; }

    public int SalesInvoiceId { get; set; }

    public SalesInvoice SalesInvoice { get; set; } = null!;

    public int? PartId { get; set; }

    public Part? Part { get; set; }

    public string PartName { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public decimal UnitPrice { get; set; }

    public int Quantity { get; set; }

    public decimal LineTotal { get; set; }
}
