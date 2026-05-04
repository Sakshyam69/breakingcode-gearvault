using Microsoft.EntityFrameworkCore;
using Servers.Data;
using Servers.DTOs.Reviews;
using Servers.Models;

namespace Servers.Services;

public interface IReviewService
{
    Task<IReadOnlyCollection<ReviewResponse>> GetApprovedReviewsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ReviewResponse>> GetAllReviewsAsync(string? query, ReviewStatus? status, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ReviewResponse>> GetMyReviewsAsync(int customerId, CancellationToken cancellationToken);
    Task<ReviewResponse> CreateReviewAsync(int customerId, CreateReviewRequest request, CancellationToken cancellationToken);
    Task<ReviewResponse?> UpdateReviewStatusAsync(int reviewId, UpdateReviewStatusRequest request, int actorUserId, CancellationToken cancellationToken);
}

public sealed class ReviewValidationException : Exception
{
    public ReviewValidationException(string message) : base(message)
    {
    }
}

public sealed class ReviewService : IReviewService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public ReviewService(AppDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<IReadOnlyCollection<ReviewResponse>> GetApprovedReviewsAsync(CancellationToken cancellationToken)
    {
        var reviews = await QueryReviews()
            .AsNoTracking()
            .Where(review => review.Status == ReviewStatus.Approved)
            .OrderByDescending(review => review.CreatedAt)
            .ToArrayAsync(cancellationToken);

        return reviews.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<ReviewResponse>> GetAllReviewsAsync(
        string? query,
        ReviewStatus? status,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query?.Trim().ToLowerInvariant() ?? string.Empty;
        var reviewsQuery = QueryReviews().AsNoTracking();

        if (status.HasValue)
        {
            reviewsQuery = reviewsQuery.Where(review => review.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            reviewsQuery = reviewsQuery.Where(review =>
                review.Customer.FullName.ToLower().Contains(normalizedQuery)
                || review.Comment.ToLower().Contains(normalizedQuery)
                || review.ServiceAppointment.AppointmentNumber.ToLower().Contains(normalizedQuery)
                || review.Rating.ToString().Contains(normalizedQuery));
        }

        var reviews = await reviewsQuery
            .OrderByDescending(review => review.CreatedAt)
            .Take(100)
            .ToArrayAsync(cancellationToken);

        return reviews.Select(ToResponse).ToArray();
    }

    public async Task<IReadOnlyCollection<ReviewResponse>> GetMyReviewsAsync(
        int customerId,
        CancellationToken cancellationToken)
    {
        var reviews = await QueryReviews()
            .AsNoTracking()
            .Where(review => review.CustomerId == customerId)
            .OrderByDescending(review => review.CreatedAt)
            .ToArrayAsync(cancellationToken);

        return reviews.Select(ToResponse).ToArray();
    }

    public async Task<ReviewResponse> CreateReviewAsync(
        int customerId,
        CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureCustomerExistsAsync(customerId, cancellationToken);
        await EnsureAppointmentIsCompletedAndBelongsToCustomerAsync(customerId, request.ServiceAppointmentId, cancellationToken);
        await EnsureNoExistingReviewForAppointmentAsync(request.ServiceAppointmentId, cancellationToken);

        var review = new Review
        {
            CustomerId = customerId,
            ServiceAppointmentId = request.ServiceAppointmentId,
            Rating = request.Rating,
            Comment = request.Comment.Trim(),
            Status = ReviewStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForRoleAsync(
            UserRole.Staff,
            "ReviewCreated",
            "New service review",
            $"A new review has been submitted for appointment {review.ServiceAppointmentId}.",
            "/staff/reviews",
            nameof(Review),
            review.ReviewId,
            cancellationToken);

        var createdReview = await GetReviewWithDetailsAsync(review.ReviewId, cancellationToken);
        return ToResponse(createdReview ?? review);
    }

    public async Task<ReviewResponse?> UpdateReviewStatusAsync(
        int reviewId,
        UpdateReviewStatusRequest request,
        int actorUserId,
        CancellationToken cancellationToken)
    {
        var review = await QueryReviews()
            .FirstOrDefaultAsync(current => current.ReviewId == reviewId, cancellationToken);

        if (review is null)
        {
            return null;
        }

        review.Status = request.Status;
        review.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.CreateForUserAsync(
            review.CustomerId,
            "ReviewUpdated",
            "Review status updated",
            $"Your review has been {request.Status.ToString().ToLower()}.",
            "/customer/reviews",
            nameof(Review),
            review.ReviewId,
            cancellationToken);

        var updatedReview = await GetReviewWithDetailsAsync(review.ReviewId, cancellationToken);
        return ToResponse(updatedReview ?? review);
    }

    private IQueryable<Review> QueryReviews()
    {
        return _db.Reviews
            .Include(review => review.Customer)
            .Include(review => review.ServiceAppointment);
    }

    private Task<Review?> GetReviewWithDetailsAsync(int reviewId, CancellationToken cancellationToken)
    {
        return QueryReviews()
            .AsNoTracking()
            .FirstOrDefaultAsync(review => review.ReviewId == reviewId, cancellationToken);
    }

    private async Task EnsureCustomerExistsAsync(int customerId, CancellationToken cancellationToken)
    {
        var exists = await _db.Users.AnyAsync(
            user => user.Id == customerId && user.Role == UserRole.Customer,
            cancellationToken);

        if (!exists)
        {
            throw new ReviewValidationException("Customer account was not found.");
        }
    }

    private async Task EnsureAppointmentIsCompletedAndBelongsToCustomerAsync(
        int customerId,
        int serviceAppointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.ServiceAppointments
            .FirstOrDefaultAsync(appointment =>
                appointment.ServiceAppointmentId == serviceAppointmentId,
                cancellationToken);

        if (appointment is null)
        {
            throw new ReviewValidationException("Service appointment was not found.");
        }

        if (appointment.CustomerId != customerId)
        {
            throw new ReviewValidationException("This appointment does not belong to you.");
        }

        if (appointment.Status != ServiceAppointmentStatus.Completed)
        {
            throw new ReviewValidationException("You can only review completed service appointments.");
        }
    }

    private async Task EnsureNoExistingReviewForAppointmentAsync(
        int serviceAppointmentId,
        CancellationToken cancellationToken)
    {
        var exists = await _db.Reviews.AnyAsync(
            review => review.ServiceAppointmentId == serviceAppointmentId,
            cancellationToken);

        if (exists)
        {
            throw new ReviewValidationException("A review for this appointment already exists.");
        }
    }

    private static ReviewResponse ToResponse(Review review)
    {
        return new ReviewResponse(
            review.ReviewId,
            review.CustomerId,
            GetUserDisplayName(review.Customer),
            review.ServiceAppointmentId,
            review.ServiceAppointment?.AppointmentNumber ?? string.Empty,
            review.Rating,
            review.Comment,
            review.Status,
            review.CreatedAt,
            review.UpdatedAt);
    }

    private static string GetUserDisplayName(User? user)
    {
        if (!string.IsNullOrWhiteSpace(user?.FullName))
        {
            return user.FullName;
        }

        return user is null ? string.Empty : $"Customer #{user.Id}";
    }
}
