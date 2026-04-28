using System.Text.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using Servers.Configuration;
using Servers.DTOs.Uploads;

namespace Servers.Services;

public interface ICloudinaryService
{
    Task<UploadResponse> UploadAsync(
        IFormFile file,
        string? folder,
        CancellationToken cancellationToken);
}

public sealed class CloudinaryService : ICloudinaryService
{
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    };

    private const long MaxFileSize = 5 * 1024 * 1024;
    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudinaryService> _logger;
    private readonly CloudinaryOptions _options;

    public CloudinaryService(
        HttpClient httpClient,
        ILogger<CloudinaryService> logger,
        IOptions<CloudinaryOptions> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<UploadResponse> UploadAsync(
        IFormFile file,
        string? folder,
        CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("Choose an image to upload.");
        }

        if (file.Length > MaxFileSize)
        {
            throw new InvalidOperationException("Image must be 5 MB or smaller.");
        }

        if (!AllowedImageContentTypes.Contains(file.ContentType))
        {
            throw new InvalidOperationException("Only JPG, PNG, WEBP, or GIF images are allowed.");
        }

        EnsureConfigured();

        var uploadFolder = string.IsNullOrWhiteSpace(folder)
            ? _options.DefaultFolder
            : folder.Trim();
        var uploadPreset = string.IsNullOrWhiteSpace(_options.UploadPreset)
            ? "images"
            : _options.UploadPreset.Trim();
        _logger.LogInformation(
            "Uploading image to Cloudinary with preset '{UploadPreset}' and folder '{UploadFolder}'.",
            uploadPreset,
            uploadFolder);

        using var content = new MultipartFormDataContent();

        AddFormField(content, "upload_preset", uploadPreset);
        AddFormField(content, "folder", uploadFolder);

        await using var stream = file.OpenReadStream();
        using var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
        fileContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "\"file\"",
            FileName = $"\"{file.FileName}\""
        };
        content.Add(fileContent, "file", file.FileName);

        var endpoint = $"https://api.cloudinary.com/v1_1/{_options.CloudName}/image/upload"
            + $"?upload_preset={Uri.EscapeDataString(uploadPreset)}"
            + $"&folder={Uri.EscapeDataString(uploadFolder)}";
        using var response = await _httpClient.PostAsync(endpoint, content, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(GetCloudinaryErrorMessage(body));
        }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        return new UploadResponse(
            root.GetProperty("secure_url").GetString() ?? string.Empty,
            root.GetProperty("public_id").GetString() ?? string.Empty,
            root.GetProperty("resource_type").GetString() ?? string.Empty,
            root.TryGetProperty("format", out var format) ? format.GetString() ?? string.Empty : string.Empty);
    }

    private static string GetCloudinaryErrorMessage(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return "Cloudinary upload failed.";
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            if (document.RootElement.TryGetProperty("error", out var error)
                && error.TryGetProperty("message", out var message)
                && !string.IsNullOrWhiteSpace(message.GetString()))
            {
                var cloudinaryMessage = message.GetString() ?? "Upload failed";
                var hint = cloudinaryMessage.Contains("Upload preset", StringComparison.OrdinalIgnoreCase)
                    ? " Make sure an unsigned upload preset named images exists in Cloudinary, or set Cloudinary_UploadPreset to your unsigned preset name, then restart the API."
                    : string.Empty;

                return $"Cloudinary upload failed: {cloudinaryMessage}.{hint}";
            }
        }
        catch (JsonException)
        {
            return "Cloudinary upload failed.";
        }

        return "Cloudinary upload failed.";
    }

    private static void AddFormField(MultipartFormDataContent content, string name, string value)
    {
        var field = new StringContent(value);
        field.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = $"\"{name}\""
        };
        content.Add(field, name);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.CloudName))
        {
            throw new InvalidOperationException("Cloudinary is not configured. Set Cloudinary_CloudName in Servers/Servers/.env.");
        }
    }
}
