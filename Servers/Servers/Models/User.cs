namespace Servers.Models;

public enum UserRole
{
    Admin,
    Staff,
    Customer
}

public enum AccountSetupStatus
{
    PendingSetup,
    Complete
}

public sealed class User
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public AccountSetupStatus AccountSetupStatus { get; set; } = AccountSetupStatus.Complete;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public UserProfile? Profile { get; set; }
}
