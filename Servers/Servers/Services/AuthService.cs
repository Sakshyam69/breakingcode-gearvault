using System.Net.Mail;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;
using Servers.Authentication;
using Servers.Configuration;
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

    Task<StaffCreatedCustomerResponse> CreateCustomerByStaffAsync(
        CreateCustomerByStaffRequest request,
        CancellationToken cancellationToken);

    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    Task<UserResponse?> GetUserAsync(int userId, CancellationToken cancellationToken);

    Task<IReadOnlyCollection<UserResponse>> GetUsersAsync(CancellationToken cancellationToken);
}

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthTokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly BrevoEmailOptions _emailOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        IAuthTokenService tokenService,
        IEmailService emailService,
        IOptions<BrevoEmailOptions> emailOptions,
        ILogger<AuthService> logger)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _emailService = emailService;
        _emailOptions = emailOptions.Value;
        _logger = logger;
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
            AccountSetupStatus.Complete,
            cancellationToken);

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> CreateStaffAsync(
        CreateStaffRequest request,
        CancellationToken cancellationToken)
    {
        var user = await CreateUserAsync(
            string.Empty,
            request.Email,
            string.Empty,
            request.Password,
            UserRole.Staff,
            AccountSetupStatus.PendingSetup,
            cancellationToken);

        var credentialEmailSent = await TrySendStaffCredentialEmailAsync(user, request.Password, cancellationToken);

        return BuildAuthResponse(user, credentialEmailSent);
    }

    public async Task<StaffCreatedCustomerResponse> CreateCustomerByStaffAsync(
        CreateCustomerByStaffRequest request,
        CancellationToken cancellationToken)
    {
        var user = await CreateUserAsync(
            string.Empty,
            request.Email,
            string.Empty,
            request.Password,
            UserRole.Customer,
            AccountSetupStatus.PendingSetup,
            cancellationToken);

        var credentialEmailSent = await TrySendCustomerCredentialEmailAsync(user, request.Password, cancellationToken);

        return new StaffCreatedCustomerResponse(ToResponse(user), credentialEmailSent);
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
        AccountSetupStatus accountSetupStatus,
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
            Role = role,
            AccountSetupStatus = accountSetupStatus
        };

        return await _users.AddAsync(user, cancellationToken);
    }

    private async Task<bool> TrySendStaffCredentialEmailAsync(
        User user,
        string temporaryPassword,
        CancellationToken cancellationToken)
    {
        try
        {
            await _emailService.SendBrandedAsync(
                new BrandedEmailMessage(
                    user.Email,
                    "Your AutoCare staff account is ready",
                    "Your AutoCare staff login credentials are ready.",
                    "Welcome to AutoCare",
                    BuildStaffCredentialEmailBody(user.Email, temporaryPassword),
                    "Open AutoCare",
                    BuildLoginUrl(),
                    BuildStaffCredentialTextBody(user.Email, temporaryPassword),
                    user.FullName),
                cancellationToken);

            return true;
        }
        catch (Exception exception) when (exception is InvalidOperationException or SmtpException)
        {
            _logger.LogWarning(
                exception,
                "Staff account {StaffEmail} was created, but the credential email could not be sent.",
                user.Email);

            return false;
        }
    }

    private async Task<bool> TrySendCustomerCredentialEmailAsync(
        User user,
        string temporaryPassword,
        CancellationToken cancellationToken)
    {
        try
        {
            await _emailService.SendBrandedAsync(
                new BrandedEmailMessage(
                    user.Email,
                    "Your AutoCare customer account is ready",
                    "Your AutoCare customer login credentials are ready.",
                    "Welcome to AutoCare",
                    BuildCustomerCredentialEmailBody(user.Email, temporaryPassword),
                    "Open AutoCare",
                    BuildLoginUrl(),
                    BuildCustomerCredentialTextBody(user.Email, temporaryPassword),
                    user.FullName),
                cancellationToken);

            return true;
        }
        catch (Exception exception) when (exception is InvalidOperationException or SmtpException)
        {
            _logger.LogWarning(
                exception,
                "Customer account {CustomerEmail} was created, but the credential email could not be sent.",
                user.Email);

            return false;
        }
    }

    private string BuildLoginUrl()
    {
        if (string.IsNullOrWhiteSpace(_emailOptions.AppBaseUrl))
        {
            return string.Empty;
        }

        return $"{_emailOptions.AppBaseUrl.TrimEnd('/')}/login";
    }

    private static string BuildStaffCredentialEmailBody(string email, string temporaryPassword)
    {
        var encodedEmail = HtmlEncoder.Default.Encode(email);
        var encodedPassword = HtmlEncoder.Default.Encode(temporaryPassword);

        return $"""
               <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:26px;font-weight:900;">Hello,</p>
               <p style="margin:0 0 22px;color:#374151;font-size:15px;line-height:24px;">An admin has created a staff account for you. Use the temporary credentials below to sign in to the AutoCare staff dashboard.</p>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 24px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                 <tr>
                   <td width="64" style="padding:18px 0 18px 18px;vertical-align:top;">
                     <div style="width:48px;height:48px;background:#ef1f2d;border-radius:8px;color:#ffffff;text-align:center;font-size:25px;line-height:48px;font-weight:900;">@</div>
                   </td>
                   <td style="padding:18px 18px 18px 0;vertical-align:middle;">
                     <div style="color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Email</div>
                     <div style="margin-top:6px;color:#111827;font-size:17px;font-weight:900;line-height:22px;">{encodedEmail}</div>
                   </td>
                 </tr>
                 <tr>
                   <td width="64" style="padding:18px 0 18px 18px;vertical-align:top;border-top:1px solid #e5e7eb;">
                     <div style="width:48px;height:48px;background:#ef1f2d;border-radius:8px;color:#ffffff;text-align:center;font-size:25px;line-height:48px;font-weight:900;">#</div>
                   </td>
                   <td style="padding:18px 18px 18px 0;vertical-align:middle;border-top:1px solid #e5e7eb;">
                     <div style="color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Temporary password</div>
                     <div style="margin-top:6px;color:#111827;font-size:17px;font-weight:900;line-height:22px;">{encodedPassword}</div>
                   </td>
                 </tr>
               </table>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 18px;border-collapse:collapse;">
                 <tr>
                   <td width="74" style="padding:18px 0 18px 18px;background:#fff1f2;border-left:4px solid #ef1f2d;border-top:1px solid #fecdd3;border-bottom:1px solid #fecdd3;vertical-align:middle;">
                     <div style="width:42px;height:42px;color:#ef1f2d;text-align:center;font-size:30px;line-height:42px;font-weight:900;">!</div>
                   </td>
                   <td style="padding:18px 18px 18px 0;background:#fff1f2;border-top:1px solid #fecdd3;border-right:1px solid #fecdd3;border-bottom:1px solid #fecdd3;color:#1f2937;font-size:14px;line-height:22px;">
                     After signing in, complete your staff profile and set a new password. The temporary password should only be used once.
                   </td>
                 </tr>
               </table>
               """;
    }

    private static string BuildStaffCredentialTextBody(string email, string temporaryPassword)
    {
        return $"""
               An admin has created a staff account for you.

               Email: {email}
               Temporary password: {temporaryPassword}

               After signing in, complete your profile from the staff dashboard.
               """;
    }

    private static string BuildCustomerCredentialEmailBody(string email, string temporaryPassword)
    {
        var encodedEmail = HtmlEncoder.Default.Encode(email);
        var encodedPassword = HtmlEncoder.Default.Encode(temporaryPassword);

        return $"""
               <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:26px;font-weight:900;">Hello,</p>
               <p style="margin:0 0 22px;color:#374151;font-size:15px;line-height:24px;">A staff member has created your AutoCare customer account. Use the temporary credentials below to sign in.</p>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 24px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                 <tr>
                   <td width="64" style="padding:18px 0 18px 18px;vertical-align:top;">
                     <div style="width:48px;height:48px;background:#ef1f2d;border-radius:8px;color:#ffffff;text-align:center;font-size:25px;line-height:48px;font-weight:900;">@</div>
                   </td>
                   <td style="padding:18px 18px 18px 0;vertical-align:middle;">
                     <div style="color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Email</div>
                     <div style="margin-top:6px;color:#111827;font-size:17px;font-weight:900;line-height:22px;">{encodedEmail}</div>
                   </td>
                 </tr>
                 <tr>
                   <td width="64" style="padding:18px 0 18px 18px;vertical-align:top;border-top:1px solid #e5e7eb;">
                     <div style="width:48px;height:48px;background:#ef1f2d;border-radius:8px;color:#ffffff;text-align:center;font-size:25px;line-height:48px;font-weight:900;">#</div>
                   </td>
                   <td style="padding:18px 18px 18px 0;vertical-align:middle;border-top:1px solid #e5e7eb;">
                     <div style="color:#6b7280;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Temporary password</div>
                     <div style="margin-top:6px;color:#111827;font-size:17px;font-weight:900;line-height:22px;">{encodedPassword}</div>
                   </td>
                 </tr>
               </table>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 18px;border-collapse:collapse;">
                 <tr>
                   <td width="74" style="padding:18px 0 18px 18px;background:#fff1f2;border-left:4px solid #ef1f2d;border-top:1px solid #fecdd3;border-bottom:1px solid #fecdd3;vertical-align:middle;">
                     <div style="width:42px;height:42px;color:#ef1f2d;text-align:center;font-size:30px;line-height:42px;font-weight:900;">!</div>
                   </td>
                   <td style="padding:18px 18px 18px 0;background:#fff1f2;border-top:1px solid #fecdd3;border-right:1px solid #fecdd3;border-bottom:1px solid #fecdd3;color:#1f2937;font-size:14px;line-height:22px;">
                     After signing in, complete your profile and set a new password. The temporary password should only be used once.
                   </td>
                 </tr>
               </table>
               """;
    }

    private static string BuildCustomerCredentialTextBody(string email, string temporaryPassword)
    {
        return $"""
               A staff member has created your AutoCare customer account.

               Email: {email}
               Temporary password: {temporaryPassword}

               After signing in, complete your profile and set a new password.
               """;
    }

    private AuthResponse BuildAuthResponse(User user, bool credentialEmailSent = false)
    {
        var token = _tokenService.CreateToken(user);
        return new AuthResponse(token.Token, token.ExpiresAt, ToResponse(user), credentialEmailSent);
    }

    private static UserResponse ToResponse(User user)
    {
        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role,
            user.AccountSetupStatus,
            ToProfileResponse(user.Profile),
            user.CreatedAt);
    }

    private static UserProfileResponse? ToProfileResponse(UserProfile? profile)
    {
        return profile is null
            ? null
            : new UserProfileResponse(
                profile.Address,
                profile.City,
                profile.DateOfBirth,
                profile.Gender,
                profile.ProfileImageUrl,
                profile.EmergencyContactPhone,
                profile.CreatedAt,
                profile.UpdatedAt);
    }
}
