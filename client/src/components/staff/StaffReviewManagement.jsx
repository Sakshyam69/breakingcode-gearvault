import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Star, MessageSquare } from 'lucide-react'
import { getAllReviews, updateReviewStatus } from '../../lib/auth'

export function StaffReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [filters, setFilters] = useState({
    query: '',
    status: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const reviewData = await getAllReviews(filters)
        if (isMounted) {
          setReviews(reviewData)
        }
      } catch (exception) {
        if (isMounted) {
          setError(exception.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [filters])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleUpdateStatus(reviewId, status) {
    setError('')
    setMessage('')
    setIsUpdating(reviewId)

    try {
      const updatedReview = await updateReviewStatus(reviewId, { status })
      setReviews((current) =>
        current.map((review) =>
          review.reviewId === reviewId ? updatedReview : review
        )
      )
      setMessage(`Review has been ${status.toLowerCase()}.`)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-red-600">Staff</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Manage Reviews</h2>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
          <MessageSquare size={22} />
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Search
          <input
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
            name="query"
            placeholder="Search by customer, comment, or rating..."
            value={filters.query}
            onChange={handleFilterChange}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Status
          <select
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </label>
      </div>

      {error && <Message tone="error">{error}</Message>}
      {message && <Message tone="success">{message}</Message>}

      <div className="mt-6 grid gap-4">
        {isLoading ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading reviews...</p>
        ) : reviews.length > 0 ? reviews.map((review) => (
          <article key={review.reviewId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">{review.appointmentNumber}</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{review.customerName}</h3>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= review.rating ? 'text-amber-500' : 'text-slate-300'}
                      fill={star <= review.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${
                review.status === 'Approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : review.status === 'Rejected'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {review.status}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{review.comment}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">
              {new Date(review.createdAt).toLocaleDateString('en', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>

            {review.status === 'Pending' && (
              <div className="mt-4 flex gap-3">
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-70"
                  type="button"
                  onClick={() => handleUpdateStatus(review.reviewId, 'Approved')}
                  disabled={isUpdating === review.reviewId}
                >
                  <CheckCircle2 size={17} />
                  {isUpdating === review.reviewId ? 'Approving...' : 'Approve'}
                </button>
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                  type="button"
                  onClick={() => handleUpdateStatus(review.reviewId, 'Rejected')}
                  disabled={isUpdating === review.reviewId}
                >
                  <XCircle size={17} />
                  {isUpdating === review.reviewId ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            )}
          </article>
        )) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No reviews found.</p>
        )}
      </div>
    </div>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-4 border-red-200 bg-red-50 text-red-700'
    : 'mt-4 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}
