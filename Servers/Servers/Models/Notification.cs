namespace Servers.Models;

public sealed class Notification
{
    public int NotificationId { get; set; }

    public int? UserId { get; set; }

    public User? User { get; set; }

    public string RoleTarget { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string LinkUrl { get; set; } = string.Empty;

    public string RelatedEntityType { get; set; } = string.Empty;

    public int? RelatedEntityId { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
