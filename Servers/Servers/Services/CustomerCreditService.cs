using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.Models;

namespace Servers.Services;

public interface ICustomerCreditService
{
    Task<decimal> GetBalanceAsync(int customerId, CancellationToken cancellationToken);

    Task ApplyCreditAsync(
        int customerId,
        decimal amount,
        string sourceType,
        int sourceId,
        string notes,
        CancellationToken cancellationToken);

    Task AddCreditAsync(
        int customerId,
        decimal amount,
        string sourceType,
        int sourceId,
        string notes,
        CancellationToken cancellationToken);
}

public sealed class CustomerCreditValidationException : Exception
{
    public CustomerCreditValidationException(string message)
        : base(message)
    {
    }
}

public sealed class CustomerCreditService : ICustomerCreditService
{
    private readonly AppDbContext _db;

    public CustomerCreditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<decimal> GetBalanceAsync(int customerId, CancellationToken cancellationToken)
    {
        return await _db.CustomerCreditAccounts
            .AsNoTracking()
            .Where(account => account.CustomerId == customerId)
            .Select(account => account.Balance)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task ApplyCreditAsync(
        int customerId,
        decimal amount,
        string sourceType,
        int sourceId,
        string notes,
        CancellationToken cancellationToken)
    {
        if (amount <= 0)
        {
            return;
        }

        var account = await GetOrCreateAccountAsync(customerId, cancellationToken);
        if (account.Balance < amount)
        {
            throw new CustomerCreditValidationException("Customer credit balance is not enough for this invoice.");
        }

        account.Balance -= amount;
        account.UpdatedAt = DateTime.UtcNow;

        AddTransaction(account, CustomerCreditTransactionType.CreditApplied, amount, sourceType, sourceId, notes);
    }

    public async Task AddCreditAsync(
        int customerId,
        decimal amount,
        string sourceType,
        int sourceId,
        string notes,
        CancellationToken cancellationToken)
    {
        if (amount <= 0)
        {
            return;
        }

        var account = await GetOrCreateAccountAsync(customerId, cancellationToken);
        account.Balance += amount;
        account.UpdatedAt = DateTime.UtcNow;

        AddTransaction(account, CustomerCreditTransactionType.CreditAdded, amount, sourceType, sourceId, notes);
    }

    private async Task<CustomerCreditAccount> GetOrCreateAccountAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var account = await _db.CustomerCreditAccounts
            .FirstOrDefaultAsync(current => current.CustomerId == customerId, cancellationToken);

        if (account is not null)
        {
            return account;
        }

        account = new CustomerCreditAccount
        {
            CustomerId = customerId,
            CreatedAt = DateTime.UtcNow
        };
        _db.CustomerCreditAccounts.Add(account);

        return account;
    }

    private void AddTransaction(
        CustomerCreditAccount account,
        CustomerCreditTransactionType type,
        decimal amount,
        string sourceType,
        int sourceId,
        string notes)
    {
        _db.CustomerCreditTransactions.Add(new CustomerCreditTransaction
        {
            Account = account,
            CustomerId = account.CustomerId,
            Type = type,
            Amount = amount,
            SourceType = sourceType,
            SourceId = sourceId,
            Notes = notes,
            CreatedAt = DateTime.UtcNow
        });
    }
}
