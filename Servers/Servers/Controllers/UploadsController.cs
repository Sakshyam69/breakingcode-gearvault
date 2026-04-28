using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.Uploads;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class UploadsController : ControllerBase
{
    private readonly ICloudinaryService _cloudinary;

    public UploadsController(ICloudinaryService cloudinary)
    {
        _cloudinary = cloudinary;
    }

    [HttpPost("profile-image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadProfileImage(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _cloudinary.UploadAsync(file, null, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
