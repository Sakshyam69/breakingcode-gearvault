using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.Auth;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register/customer")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> RegisterCustomer(
        RegisterCustomerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.RegisterCustomerAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Me), new { }, response);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpPost("staff")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<ActionResult<AuthResponse>> CreateStaff(
        CreateStaffRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.CreateStaffAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetUsers), new { }, response);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpPost("customers")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<StaffCreatedCustomerResponse>> CreateCustomer(
        CreateCustomerByStaffRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.CreateCustomerByStaffAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetUsers), new { }, response);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);
        if (response is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var user = await _authService.GetUserAsync(userId, cancellationToken);
        return user is null ? NotFound(new { message = "User not found." }) : Ok(user);
    }

    [HttpGet("users")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    public async Task<ActionResult<IReadOnlyCollection<UserResponse>>> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _authService.GetUsersAsync(cancellationToken);
        return Ok(users);
    }
}
