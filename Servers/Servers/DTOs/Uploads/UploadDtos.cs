namespace Servers.DTOs.Uploads;

public sealed record UploadResponse(
    string Url,
    string PublicId,
    string ResourceType,
    string Format);
