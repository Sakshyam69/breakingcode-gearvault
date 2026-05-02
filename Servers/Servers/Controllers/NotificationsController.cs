using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.Notifications;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
    {
        _notifications = notifications;
    }

    [HttpGet("me")]
    public async Task<ActionResult<IReadOnlyCollection<NotificationResponse>>> GetMyNotifications(
        CancellationToken cancellationToken)
    {
        if (!TryGetUser(out var userId, out var role))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var notifications = await _notifications.GetForUserAsync(userId, role, cancellationToken);
        return Ok(notifications);
    }

    [HttpPut("{notificationId:int}/read")]
    public async Task<ActionResult<NotificationResponse>> MarkRead(
        int notificationId,
        CancellationToken cancellationToken)
    {
        if (!TryGetUser(out var userId, out var role))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var notification = await _notifications.MarkReadAsync(notificationId, userId, role, cancellationToken);
        return notification is null
            ? NotFound(new { message = "Notification not found." })
            : Ok(notification);
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        if (!TryGetUser(out var userId, out var role))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        await _notifications.MarkAllReadAsync(userId, role, cancellationToken);
        return NoContent();
    }

    private bool TryGetUser(out int userId, out UserRole role)
    {
        userId = 0;
        role = default;

        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleValue = User.FindFirstValue(ClaimTypes.Role);

        return int.TryParse(userIdValue, out userId)
            && Enum.TryParse(roleValue, out role);
    }
}
