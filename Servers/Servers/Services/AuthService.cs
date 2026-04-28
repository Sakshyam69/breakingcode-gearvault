using System.Security.Cryptography;
using Servers.Authentication;
using Servers.DTOs.Auth;
using Servers.Models;
using Servers.Repositories;

namespace Servers.Services;

public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string passwordHash);
}

public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            KeySize);

        return string.Join(
            ".",
            "PBKDF2-SHA256",
            Iterations,
            Convert.ToBase64String(salt),
            Convert.ToBase64String(key));
    }

    public bool Verify(string password, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(passwordHash))
        {
            return false;
        }

        var parts = passwordHash.Split('.');
        if (parts.Length != 4 || parts[0] != "PBKDF2-SHA256")
        {
            return false;
        }

        if (!int.TryParse(parts[1], out var iterations))
        {
            return false;
        }

        byte[] salt;
        byte[] expectedKey;

        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expectedKey = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actualKey = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            expectedKey.Length);

        return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
    }
}

public interface IAuthService
{
    Task<AuthResponse> RegisterCustomerAsync(RegisterCustomerRequest request, CancellationToken cancellationToken);

    Task<AuthResponse> CreateStaffAsync(CreateStaffRequest request, CancellationToken cancellationToken);

    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    Task<UserResponse?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<UserResponse>> GetUsersAsync(CancellationToken cancellationToken);
}

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthTokenService _tokenService;

    public AuthService(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        IAuthTokenService tokenService)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<AuthResponse> RegisterCustomerAsync(
        RegisterCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var user = await CreateUserAsync(
            request.FullName,
            request.Email,
            request.Phone,
            request.Password,
            UserRole.Customer,
            cancellationToken);

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> CreateStaffAsync(
        CreateStaffRequest request,
        CancellationToken cancellationToken)
    {
        var defaultFullName = request.Email.Split('@', 2)[0];

        var user = await CreateUserAsync(
            defaultFullName,
            request.Email,
            string.Empty,
            request.Password,
            UserRole.Staff,
            cancellationToken);

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _users.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        return BuildAuthResponse(user);
    }

    public async Task<UserResponse?> GetUserAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return user is null ? null : ToResponse(user);
    }

    public async Task<IReadOnlyCollection<UserResponse>> GetUsersAsync(CancellationToken cancellationToken)
    {
        var users = await _users.GetAllAsync(cancellationToken);
        return users.Select(ToResponse).ToArray();
    }

    private async Task<User> CreateUserAsync(
        string fullName,
        string email,
        string phone,
        string password,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var existingUser = await _users.GetByEmailAsync(email, cancellationToken);
        if (existingUser is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        var user = new User
        {
            FullName = fullName.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            Phone = phone.Trim(),
            PasswordHash = _passwordHasher.Hash(password),
            Role = role
        };

        return await _users.AddAsync(user, cancellationToken);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var token = _tokenService.CreateToken(user);
        return new AuthResponse(token.Token, token.ExpiresAt, ToResponse(user));
    }

    private static UserResponse ToResponse(User user)
    {
        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role,
            user.CreatedAt);
    }
}
