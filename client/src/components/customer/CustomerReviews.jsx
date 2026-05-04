import { useEffect, useState } from 'react'
import { MessageSquare, Star, Send } from 'lucide-react'
import { createReview, getMyReviews, getMyServiceAppointments } from '../../lib/auth'

export function CustomerReviews() {
  const [reviews, setReviews] = useState([])
  const [appointments, setAppointments] = useState([])
  const [formData, setFormData] = useState({
    serviceAppointmentId: '',
    rating: 5,
    comment: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [reviewData, appointmentData] = await Promise.all([
          getMyReviews(),
          getMyServiceAppointments(),
        ])

        if (isMounted) {
          setReviews(reviewData)
          setAppointments(appointmentData)
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
  }, [])

  const completedAppointmentsWithoutReview = appointments.filter(
    (appointment) =>
      appointment.status === 'Completed' &&
      !reviews.some((review) => review.serviceAppointmentId === appointment.serviceAppointmentId)
  )

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!formData.serviceAppointmentId) {
      setError('Please select a completed service appointment to review.')
      return
    }

    setIsSubmitting(true)

    try {
      const createdReview = await createReview({
        serviceAppointmentId: Number(formData.serviceAppointmentId),
        rating: Number(formData.rating),
        comment: formData.comment,
      })
      setReviews((current) => [createdReview, ...current])
      setFormData({
        serviceAppointmentId: '',
        rating: 5,
        comment: '',
      })
      setMessage('Thank you for your review! It will be published after approval.')
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Customer</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Write a Review</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <MessageSquare size={22} />
          </span>
        </div>

        {completedAppointmentsWithoutReview.length > 0 ? (
          <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Service Appointment
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="serviceAppointmentId"
                required
                value={formData.serviceAppointmentId}
                onChange={handleChange}
              >
                <option value="">Select appointment</option>
                {completedAppointmentsWithoutReview.map((appointment) => (
                  <option key={appointment.serviceAppointmentId} value={appointment.serviceAppointmentId}>
                    {appointment.appointmentNumber} - {appointment.displayServiceType}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Rating
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, rating: star }))}
                    className={`p-2 rounded-lg transition ${
                      star <= formData.rating
                        ? 'text-amber-500 bg-amber-50'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  >
                    <Star size={24} fill={star <= formData.rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Your Review
              <textarea
                className="min-h-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="comment"
                required
                minLength={10}
                maxLength={1000}
                value={formData.comment}
                onChange={handleChange}
              />
            </label>

            {error && <Message tone="error">{error}</Message>}
            {message && <Message tone="success">{message}</Message>}

            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isLoading}
              type="submit"
            >
              <Send size={18} />
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            No completed service appointments available to review yet.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Service Center</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">My Reviews</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <Star size={22} />
          </span>
        </div>

        <div className="mt-6 grid gap-4">
          {isLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading reviews...</p>
          ) : reviews.length > 0 ? reviews.map((review) => (
            <article key={review.reviewId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
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
            </article>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No reviews yet.</p>
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
