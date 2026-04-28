using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Servers.Models;

namespace Servers.Authentication;

public static class AuthSchemes
{
    public const string Bearer = "Bearer";
}

public sealed class AuthTokenOptions
{
    public const string SectionName = "AuthToken";

    public string Issuer { get; set; } = "Autocare";

    public string Audience { get; set; } = "Autocare.Client";

    public string SecretKey { get; set; } = string.Empty;

    public int ExpirationMinutes { get; set; } = 120;
}

public interface IAuthTokenService
{
    TokenResult CreateToken(User user);

    ClaimsPrincipal? ValidateToken(string token);
}

public sealed record TokenResult(string Token, DateTime ExpiresAt);

internal sealed class AuthTokenPayload
{
    public int UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
}

public sealed class HmacAuthTokenService : IAuthTokenService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AuthTokenOptions _options;

    public HmacAuthTokenService(IOptions<AuthTokenOptions> options)
    {
        _options = options.Value;
    }

    public TokenResult CreateToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes);
        var header = new { Algorithm = "HS256", Type = "AUTHTOKEN" };
        var payload = new AuthTokenPayload
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            ExpiresAt = expiresAt
        };

        var encodedHeader = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(header, JsonOptions));
        var encodedPayload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(payload, JsonOptions));
        var signature = Sign($"{encodedHeader}.{encodedPayload}");

        return new TokenResult($"{encodedHeader}.{encodedPayload}.{signature}", expiresAt);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return null;
        }

        var unsignedToken = $"{parts[0]}.{parts[1]}";
        var expectedSignature = Sign(unsignedToken);
        if (!FixedTimeEquals(expectedSignature, parts[2]))
        {
            return null;
        }

        AuthTokenPayload? payload;

        try
        {
            var payloadBytes = WebEncoders.Base64UrlDecode(parts[1]);
            payload = JsonSerializer.Deserialize<AuthTokenPayload>(payloadBytes, JsonOptions);
        }
        catch (FormatException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }

        if (payload is null ||
            payload.ExpiresAt <= DateTime.UtcNow ||
            payload.Issuer != _options.Issuer ||
            payload.Audience != _options.Audience)
        {
            return null;
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, payload.UserId.ToString()),
            new Claim(ClaimTypes.Name, payload.FullName),
            new Claim(ClaimTypes.Email, payload.Email),
            new Claim(ClaimTypes.Role, payload.Role)
        };

        var identity = new ClaimsIdentity(claims, AuthSchemes.Bearer);
        return new ClaimsPrincipal(identity);
    }

    private string Sign(string value)
    {
        if (string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            throw new InvalidOperationException("Configure AuthToken_SecretKey in Servers/Servers/.env.");
        }

        var key = Encoding.UTF8.GetBytes(_options.SecretKey);
        using var hmac = new HMACSHA256(key);
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }

    private static string Base64UrlEncode(byte[] value)
    {
        return WebEncoders.Base64UrlEncode(value);
    }

    private static bool FixedTimeEquals(string first, string second)
    {
        var firstBytes = Encoding.UTF8.GetBytes(first);
        var secondBytes = Encoding.UTF8.GetBytes(second);
        return firstBytes.Length == secondBytes.Length &&
            CryptographicOperations.FixedTimeEquals(firstBytes, secondBytes);
    }
}

public sealed class HmacTokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IAuthTokenService _tokenService;

    public HmacTokenAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IAuthTokenService tokenService)
        : base(options, logger, encoder)
    {
        _tokenService = tokenService;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorizationHeader = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(authorizationHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        if (!authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.Fail("Unsupported authorization scheme."));
        }

        var token = authorizationHeader["Bearer ".Length..].Trim();
        var principal = _tokenService.ValidateToken(token);
        if (principal is null)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid or expired token."));
        }

        var ticket = new AuthenticationTicket(principal, AuthSchemes.Bearer);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
