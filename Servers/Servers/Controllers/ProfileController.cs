using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Servers.Authentication;
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
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthTokenService _tokenService;

    public ProfileController(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        IAuthTokenService tokenService)
    {
        _db = db;
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
}
