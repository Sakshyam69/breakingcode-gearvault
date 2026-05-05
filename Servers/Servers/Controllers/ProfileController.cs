using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Servers.Authentication;
using Servers.Configuration;
using Servers.Data;
using Servers.DTOs.Auth;
using Servers.DTOs.Profile;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ProfileController : ControllerBase
{
    private const int PasswordChangeCodeLength = 6;
    private static readonly TimeSpan PasswordChangeCodeLifetime = TimeSpan.FromMinutes(10);
    private static readonly char[] CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly BrevoEmailOptions _emailOptions;
    private readonly ILogger<ProfileController> _logger;
    private readonly IMemoryCache _memoryCache;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthTokenService _tokenService;

    public ProfileController(
        AppDbContext db,
        IEmailService emailService,
        IOptions<BrevoEmailOptions> emailOptions,
        ILogger<ProfileController> logger,
        IMemoryCache memoryCache,
        IPasswordHasher passwordHasher,
        IAuthTokenService tokenService)
    {
        _db = db;
        _emailService = emailService;
        _emailOptions = emailOptions.Value;
        _logger = logger;
        _memoryCache = memoryCache;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> Me(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var profile = await _db.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(currentProfile => currentProfile.UserId == userId, cancellationToken);

        return profile is null
            ? NotFound(new { message = "Profile details are not completed yet." })
            : Ok(ToProfileResponse(profile));
    }

    [HttpPut("me")]
    public async Task<ActionResult<AuthResponse>> Update(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var user = await _db.Users
            .Include(currentUser => currentUser.Profile)
            .FirstOrDefaultAsync(currentUser => currentUser.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.FullName = request.FullName.Trim();
        user.Phone = request.Phone.Trim();

        var profile = user.Profile ?? new UserProfile
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow
        };

        ApplyProfileUpdate(profile, request);

        if (user.Profile is null)
        {
            _db.UserProfiles.Add(profile);
            user.Profile = profile;
        }

        await _db.SaveChangesAsync(cancellationToken);

        var token = _tokenService.CreateToken(user);
        return Ok(new AuthResponse(token.Token, token.ExpiresAt, ToResponse(user)));
    }

    [HttpPost("password-change-code")]
    public async Task<ActionResult<PasswordChangeCodeResponse>> SendPasswordChangeCode(
        CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(currentUser => currentUser.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        var code = GeneratePasswordChangeCode();
        var expiresAt = DateTime.UtcNow.Add(PasswordChangeCodeLifetime);
        _memoryCache.Set(GetPasswordChangeCacheKey(user.Id), code, new DateTimeOffset(expiresAt));

        try
        {
            await _emailService.SendBrandedAsync(
                new BrandedEmailMessage(
                    user.Email,
                    "Your AutoCare password change code",
                    "Use this code to update your AutoCare password.",
                    "AutoCare Password Code",
                    BuildPasswordChangeEmailBody(user, code, expiresAt),
                    "Open Settings",
                    BuildSettingsUrl(user.Role),
                    BuildPasswordChangeTextBody(code, expiresAt),
                    user.FullName),
                cancellationToken);
        }
        catch (Exception exception) when (exception is InvalidOperationException or System.Net.Mail.SmtpException)
        {
            _memoryCache.Remove(GetPasswordChangeCacheKey(user.Id));
            _logger.LogWarning(exception, "Password change code email could not be sent to {UserEmail}.", user.Email);

            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "Password code email could not be sent. Check Brevo email settings." });
        }

        return Ok(new PasswordChangeCodeResponse(
            true,
            expiresAt,
            "Password change code sent to your email."));
    }

    [HttpPut("password")]
    public async Task<ActionResult<AuthResponse>> ChangePassword(
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var user = await _db.Users
            .Include(currentUser => currentUser.Profile)
            .FirstOrDefaultAsync(currentUser => currentUser.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        if (!_memoryCache.TryGetValue(GetPasswordChangeCacheKey(user.Id), out string? expectedCode)
            || string.IsNullOrWhiteSpace(expectedCode))
        {
            return BadRequest(new { message = "Password change code is expired. Request a new code." });
        }

        if (!string.Equals(expectedCode, NormalizePasswordChangeCode(request.Code), StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Password change code is invalid." });
        }

        if (_passwordHasher.Verify(request.NewPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "New password must be different from your current password." });
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        await _db.SaveChangesAsync(cancellationToken);
        _memoryCache.Remove(GetPasswordChangeCacheKey(user.Id));

        var token = _tokenService.CreateToken(user);
        return Ok(new AuthResponse(token.Token, token.ExpiresAt, ToResponse(user)));
    }

    [HttpPost("complete-setup")]
    public async Task<ActionResult<AuthResponse>> CompleteSetup(
        CompleteProfileSetupRequest request,
        CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var user = await _db.Users
            .Include(currentUser => currentUser.Profile)
            .FirstOrDefaultAsync(currentUser => currentUser.Id == userId, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.FullName = request.FullName.Trim();
        user.Phone = request.Phone.Trim();

        var profile = user.Profile ?? new UserProfile
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow
        };

        ApplyProfileUpdate(profile, request);

        if (user.Profile is null)
        {
            _db.UserProfiles.Add(profile);
            user.Profile = profile;
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        user.AccountSetupStatus = AccountSetupStatus.Complete;

        await _db.SaveChangesAsync(cancellationToken);

        var token = _tokenService.CreateToken(user);
        return Ok(new AuthResponse(token.Token, token.ExpiresAt, ToResponse(user)));
    }

    private static UserResponse ToResponse(User user)
    {
        return new UserResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role,
            user.IsActive,
            user.AccountSetupStatus,
            ToProfileResponse(user.Profile),
            user.CreatedAt);
    }

    private static void ApplyProfileUpdate(UserProfile profile, CompleteProfileSetupRequest request)
    {
        profile.Address = request.Address.Trim();
        profile.City = request.City.Trim();
        profile.DateOfBirth = ToUtcDateTime(request.DateOfBirth);
        profile.Gender = request.Gender.Trim();
        profile.ProfileImageUrl = request.ProfileImageUrl.Trim();
        profile.EmergencyContactPhone = request.EmergencyContactPhone.Trim();
        profile.UpdatedAt = DateTime.UtcNow;
    }

    private static void ApplyProfileUpdate(UserProfile profile, UpdateProfileRequest request)
    {
        profile.Address = request.Address.Trim();
        profile.City = request.City.Trim();
        profile.DateOfBirth = ToUtcDateTime(request.DateOfBirth);
        profile.Gender = request.Gender.Trim();
        profile.ProfileImageUrl = request.ProfileImageUrl.Trim();
        profile.EmergencyContactPhone = request.EmergencyContactPhone.Trim();
        profile.UpdatedAt = DateTime.UtcNow;
    }

    private static DateTime? ToUtcDateTime(DateTime? value)
    {
        return value.HasValue
            ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
            : null;
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

    private static string GeneratePasswordChangeCode()
    {
        Span<char> code = stackalloc char[PasswordChangeCodeLength];
        Span<byte> randomBytes = stackalloc byte[PasswordChangeCodeLength];
        RandomNumberGenerator.Fill(randomBytes);

        for (var index = 0; index < PasswordChangeCodeLength; index++)
        {
            code[index] = CodeCharacters[randomBytes[index] % CodeCharacters.Length];
        }

        return new string(code);
    }

    private static string NormalizePasswordChangeCode(string code)
    {
        return code.Trim().Replace(" ", string.Empty, StringComparison.Ordinal).ToUpperInvariant();
    }

    private static string GetPasswordChangeCacheKey(int userId)
    {
        return $"password-change-code:{userId}";
    }

    private string BuildSettingsUrl(UserRole role)
    {
        if (string.IsNullOrWhiteSpace(_emailOptions.AppBaseUrl))
        {
            return string.Empty;
        }

        var rolePath = role.ToString().ToLowerInvariant();
        return $"{_emailOptions.AppBaseUrl.TrimEnd('/')}/{rolePath}/settings";
    }

    private static string BuildPasswordChangeEmailBody(User user, string code, DateTime expiresAt)
    {
        var encodedName = HtmlEncoder.Default.Encode(GetUserDisplayName(user));
        var encodedCode = HtmlEncoder.Default.Encode(code);
        var encodedExpiry = HtmlEncoder.Default.Encode(FormatExpiry(expiresAt));

        return $"""
               <p style="margin:0 0 18px;color:#111827;font-size:18px;line-height:26px;font-weight:900;">Hello {encodedName},</p>
               <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:24px;">We received a request to update your AutoCare password. Enter the verification code below in your Settings page to continue.</p>
               <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 24px;border-collapse:separate;border-spacing:0;">
                 <tr>
                   <td style="padding:22px;background:#111827;color:#ffffff;border-radius:10px 0 0 10px;">
                     <div style="font-size:12px;color:#d1d5db;text-transform:uppercase;font-weight:900;letter-spacing:.08em;">Security code</div>
                     <div style="margin-top:10px;font-size:34px;line-height:40px;font-weight:900;letter-spacing:8px;">{encodedCode}</div>
                   </td>
                   <td style="width:38%;padding:22px;background:#ef1f2d;color:#ffffff;border-radius:0 10px 10px 0;text-align:right;">
                     <div style="font-size:12px;color:#ffe4e6;text-transform:uppercase;font-weight:900;">Expires</div>
                     <div style="margin-top:10px;font-size:17px;line-height:23px;font-weight:900;">{encodedExpiry}</div>
                   </td>
                 </tr>
               </table>
               <p style="margin:0;padding:14px 16px;background:#fff1f2;border-left:4px solid #ef1f2d;border-radius:8px;color:#1f2937;font-size:14px;line-height:22px;">If you did not request this change, keep your current password and ignore this email.</p>
               """;
    }

    private static string BuildPasswordChangeTextBody(string code, DateTime expiresAt)
    {
        return $"""
               AutoCare password change code

               Code: {code}
               Expires: {FormatExpiry(expiresAt)}

               If you did not request this change, ignore this email.
               """;
    }

    private static string GetUserDisplayName(User user)
    {
        return string.IsNullOrWhiteSpace(user.FullName)
            ? user.Email
            : user.FullName;
    }

    private static string FormatExpiry(DateTime expiresAt)
    {
        return $"{expiresAt:dd MMM yyyy, HH:mm} UTC";
    }
}
