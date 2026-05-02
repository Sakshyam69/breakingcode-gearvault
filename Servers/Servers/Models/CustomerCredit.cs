namespace Servers.Models;

public enum CustomerCreditTransactionType
{
    CreditAdded,
    CreditApplied
}

public sealed class CustomerCreditAccount
{
    public int CustomerCreditAccountId { get; set; }

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public decimal Balance { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public List<CustomerCreditTransaction> Transactions { get; set; } = [];
}

public sealed class CustomerCreditTransaction
{
    public int CustomerCreditTransactionId { get; set; }

    public int CustomerCreditAccountId { get; set; }

    public CustomerCreditAccount Account { get; set; } = null!;

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public CustomerCreditTransactionType Type { get; set; }

    public decimal Amount { get; set; }

    public string SourceType { get; set; } = string.Empty;

    public int SourceId { get; set; }

    public string Notes { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
