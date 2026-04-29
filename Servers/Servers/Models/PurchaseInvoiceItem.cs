namespace Servers.Models;

public sealed class PurchaseInvoiceItem
{
    public int PurchaseInvoiceItemId { get; set; }

    public int PurchaseInvoiceId { get; set; }

    public int PartId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal LineTotal { get; set; }

    public PurchaseInvoice PurchaseInvoice { get; set; } = null!;

    public Part Part { get; set; } = null!;
}
