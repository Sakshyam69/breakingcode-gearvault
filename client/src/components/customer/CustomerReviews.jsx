import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, Search, Star } from 'lucide-react'
import { getMyReviews } from '../../lib/auth'

export function CustomerReviews() {
  const [reviews, setReviews] = useState([])
  const [filters, setFilters] = useState({ query: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      try {
        const reviewData = await getMyReviews()
        if (isMounted) setReviews(reviewData)
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
  }, [])

  const summary = useMemo(() => {
    const total = reviews.length
    const averageRating = total > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
      : 0

    return { total, averageRating }
  }, [reviews])

  const filteredReviews = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase()
    return [...reviews]
      .filter((review) => {
        if (!normalizedQuery) return true
        return [
          review.appointmentNumber,
          review.comment,
          String(review.rating ?? ''),
        ].some((value) => value?.toLowerCase?.().includes(normalizedQuery))
      })
      .sort((left, right) => new Date(right.createdAt ?? 0) - new Date(left.createdAt ?? 0))
  }, [filters.query, reviews])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Customer</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">My Reviews</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <MessageSquare size={22} />
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Metric label="Total" value={summary.total} />
          <Metric label="Average rating" value={formatRating(summary.averageRating)} tone="amber" />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Filter</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Review list</h3>
          </div>
          <div>
            <label className="relative block min-w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="query"
                placeholder="Search appointment or comment"
                value={filters.query}
                onChange={handleFilterChange}
              />
            </label>
          </div>
        </div>

        {error && <Message tone="error">{error}</Message>}

        <div className="mt-6 grid gap-4">
          {isLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading reviews...</p>
          ) : filteredReviews.length > 0 ? filteredReviews.map((review) => (
            <article key={review.reviewId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">{review.appointmentNumber}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const star = index + 1
                      return (
                        <Star
                          key={`${review.reviewId}-${star}`}
                          size={16}
                          className={star <= review.rating ? 'text-amber-500' : 'text-slate-300'}
                          fill={star <= review.rating ? 'currentColor' : 'none'}
                        />
                      )
                    })}
                    <span className="ml-2 text-xs font-black text-slate-600">{review.rating}/5</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm font-semibold text-slate-700">{review.comment}</p>

              <p className="mt-3 text-xs font-bold text-slate-500">
                {formatDate(review.createdAt)}
              </p>
            </article>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No reviews found.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-4 border-red-200 bg-red-50 text-red-700'
    : 'mt-4 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function Metric({ label, value, tone = 'slate' }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }[tone]

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function formatDate(value) {
  if (!value) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatRating(value) {
  const rating = Number(value || 0)
  if (!Number.isFinite(rating) || rating <= 0) {
    return '0.0'
  }

  return rating.toFixed(1)
}
