namespace Servers.DTOs.Notifications;

public sealed record NotificationResponse(
    int NotificationId,
    int? UserId,
    string RoleTarget,
    string Type,
    string Title,
    string Message,
    string LinkUrl,
    string RelatedEntityType,
    int? RelatedEntityId,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt);
