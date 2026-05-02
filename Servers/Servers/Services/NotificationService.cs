using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.Notifications;
using Servers.Models;

namespace Servers.Services;

public interface INotificationService
{
    Task CreateForUserAsync(
        int userId,
        string type,
        string title,
        string message,
        string linkUrl,
        string relatedEntityType,
        int? relatedEntityId,
        CancellationToken cancellationToken);

    Task CreateForRoleAsync(
        UserRole role,
        string type,
        string title,
        string message,
        string linkUrl,
        string relatedEntityType,
        int? relatedEntityId,
        CancellationToken cancellationToken);

    Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(
        int userId,
        UserRole role,
        CancellationToken cancellationToken);

    Task<NotificationResponse?> MarkReadAsync(
        int notificationId,
        int userId,
        UserRole role,
        CancellationToken cancellationToken);

    Task MarkAllReadAsync(int userId, UserRole role, CancellationToken cancellationToken);
}

public sealed class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task CreateForUserAsync(
        int userId,
        string type,
        string title,
        string message,
        string linkUrl,
        string relatedEntityType,
        int? relatedEntityId,
        CancellationToken cancellationToken)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type.Trim(),
            Title = title.Trim(),
            Message = message.Trim(),
            LinkUrl = linkUrl.Trim(),
            RelatedEntityType = relatedEntityType.Trim(),
            RelatedEntityId = relatedEntityId,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task CreateForRoleAsync(
        UserRole role,
        string type,
        string title,
        string message,
        string linkUrl,
        string relatedEntityType,
        int? relatedEntityId,
        CancellationToken cancellationToken)
    {
        var users = await _db.Users
            .AsNoTracking()
            .Where(user => user.Role == role)
            .Select(user => user.Id)
            .ToArrayAsync(cancellationToken);

        if (users.Length == 0)
        {
            _db.Notifications.Add(BuildRoleNotification(null));
        }
        else
        {
            _db.Notifications.AddRange(users.Select(userId => BuildRoleNotification(userId)));
        }

        await _db.SaveChangesAsync(cancellationToken);

        Notification BuildRoleNotification(int? userId)
        {
            return new Notification
            {
                UserId = userId,
                RoleTarget = role.ToString(),
                Type = type.Trim(),
                Title = title.Trim(),
                Message = message.Trim(),
                LinkUrl = linkUrl.Trim(),
                RelatedEntityType = relatedEntityType.Trim(),
                RelatedEntityId = relatedEntityId,
                CreatedAt = DateTime.UtcNow
            };
        }
    }

    public async Task<IReadOnlyCollection<NotificationResponse>> GetForUserAsync(
        int userId,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var roleTarget = role.ToString();
        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(notification =>
                notification.UserId == userId
                || (notification.UserId == null && notification.RoleTarget == roleTarget))
            .OrderBy(notification => notification.IsRead)
            .ThenByDescending(notification => notification.CreatedAt)
            .Take(50)
            .ToArrayAsync(cancellationToken);

        return notifications.Select(ToResponse).ToArray();
    }

    public async Task<NotificationResponse?> MarkReadAsync(
        int notificationId,
        int userId,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var roleTarget = role.ToString();
        var notification = await _db.Notifications.FirstOrDefaultAsync(current =>
            current.NotificationId == notificationId
            && (current.UserId == userId || (current.UserId == null && current.RoleTarget == roleTarget)),
            cancellationToken);

        if (notification is null)
        {
            return null;
        }

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return ToResponse(notification);
    }

    public async Task MarkAllReadAsync(int userId, UserRole role, CancellationToken cancellationToken)
    {
        var roleTarget = role.ToString();
        var notifications = await _db.Notifications
            .Where(notification =>
                !notification.IsRead
                && (notification.UserId == userId || (notification.UserId == null && notification.RoleTarget == roleTarget)))
            .ToArrayAsync(cancellationToken);

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static NotificationResponse ToResponse(Notification notification)
    {
        return new NotificationResponse(
            notification.NotificationId,
            notification.UserId,
            notification.RoleTarget,
            notification.Type,
            notification.Title,
            notification.Message,
            notification.LinkUrl,
            notification.RelatedEntityType,
            notification.RelatedEntityId,
            notification.IsRead,
            notification.ReadAt,
            notification.CreatedAt);
    }
}
