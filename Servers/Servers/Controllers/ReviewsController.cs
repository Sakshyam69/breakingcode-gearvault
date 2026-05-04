using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Servers.DTOs.Reviews;
using Servers.Models;
using Servers.Services;

namespace Servers.Controllers;

[ApiController]
[Authorize]
[Route("api/reviews")]
public sealed class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviews;

    public ReviewsController(IReviewService reviews)
    {
        _reviews = reviews;
    }

    [HttpGet("approved")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyCollection<ReviewResponse>>> GetApprovedReviews(
        CancellationToken cancellationToken)
    {
        var reviews = await _reviews.GetApprovedReviewsAsync(cancellationToken);
        return Ok(reviews);
    }

    [HttpGet]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<IReadOnlyCollection<ReviewResponse>>> GetAllReviews(
        [FromQuery] string? query,
        [FromQuery] ReviewStatus? status,
        CancellationToken cancellationToken)
    {
        var reviews = await _reviews.GetAllReviewsAsync(query, status, cancellationToken);
        return Ok(reviews);
    }

    [HttpGet("me")]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<IReadOnlyCollection<ReviewResponse>>> GetMyReviews(
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var reviews = await _reviews.GetMyReviewsAsync(userId, cancellationToken);
        return Ok(reviews);
    }

    [HttpPost]
    [Authorize(Roles = nameof(UserRole.Customer))]
    public async Task<ActionResult<ReviewResponse>> CreateReview(
        CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var review = await _reviews.CreateReviewAsync(userId, request, cancellationToken);
            return CreatedAtAction(nameof(GetReview), new { reviewId = review.ReviewId }, review);
        }
        catch (ReviewValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("{reviewId:int}")]
    public async Task<ActionResult<ReviewResponse>> GetReview(
        int reviewId,
        CancellationToken cancellationToken)
    {
        int? requiredCustomerId = null;
        if (User.IsInRole(nameof(UserRole.Customer)))
        {
            if (!TryGetUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid token subject." });
            }

            requiredCustomerId = userId;
        }

        var review = await _reviews.GetAllReviewsAsync(null, null, cancellationToken);
        var foundReview = review.FirstOrDefault(r => r.ReviewId == reviewId);

        if (foundReview == null)
        {
            return NotFound(new { message = "Review not found." });
        }

        if (requiredCustomerId.HasValue && foundReview.CustomerId != requiredCustomerId.Value)
        {
            return Forbid();
        }

        return Ok(foundReview);
    }

    [HttpPut("{reviewId:int}/status")]
    [Authorize(Roles = $"{nameof(UserRole.Admin)},{nameof(UserRole.Staff)}")]
    public async Task<ActionResult<ReviewResponse>> UpdateReviewStatus(
        int reviewId,
        UpdateReviewStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        try
        {
            var review = await _reviews.UpdateReviewStatusAsync(reviewId, request, userId, cancellationToken);
            return review is null ? NotFound(new { message = "Review not found." }) : Ok(review);
        }
        catch (ReviewValidationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    private bool TryGetUserId(out int userId)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdValue, out userId);
    }
}
