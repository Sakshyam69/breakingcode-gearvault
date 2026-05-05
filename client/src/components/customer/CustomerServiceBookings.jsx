import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, MessageSquare, Send, Star, Wrench, X, XCircle } from 'lucide-react'
import {
  cancelMyServiceAppointment,
  createReview,
  createMyServiceAppointment,
  getMyServiceAppointments,
  getMyReviews,
  getMyVehicles,
} from '../../lib/auth'

const serviceTypes = [
  'General Service',
  'Oil Change',
  'Brake Inspection',
  'Engine Diagnosis',
  'Battery/Electrical',
  'Tire/Wheel Service',
  'AC Service',
  'Suspension Check',
  'Other',
]

const timeSlots = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
]

const urgencyOptions = ['Low', 'Normal', 'High', 'Urgent']
const appointmentPageSize = 2

const initialFormData = {
  vehicleId: '',
  serviceType: 'General Service',
  customServiceType: '',
  urgency: 'Normal',
  preferredDate: getTodayInputValue(),
  preferredTimeSlot: timeSlots[0],
  mileageAtBooking: '',
  problemDescription: '',
  customerNote: '',
}

export function CustomerServiceBookings() {
  const [formData, setFormData] = useState(initialFormData)
  const [vehicles, setVehicles] = useState([])
  const [appointments, setAppointments] = useState([])
  const [reviews, setReviews] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appointmentPage, setAppointmentPage] = useState(1)
  const [reviewingAppointment, setReviewingAppointment] = useState(null)
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' })
  const [reviewError, setReviewError] = useState('')
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [vehicleData, appointmentData, reviewData] = await Promise.all([
          getMyVehicles(),
          getMyServiceAppointments(),
          getMyReviews(),
        ])

        if (isMounted) {
          setVehicles(vehicleData)
          setAppointments(appointmentData)
          setReviews(reviewData)
          setFormData((current) => ({
            ...current,
            vehicleId: current.vehicleId || String(vehicleData.find((vehicle) => vehicle.isPrimary)?.customerVehicleId ?? vehicleData[0]?.customerVehicleId ?? ''),
          }))
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

  const summary = useMemo(() => ({
    active: appointments.filter((appointment) => ['Pending', 'Confirmed', 'InProgress'].includes(appointment.status)).length,
    completed: appointments.filter((appointment) => appointment.status === 'Completed').length,
    upcoming: appointments.filter((appointment) => ['Pending', 'Confirmed'].includes(appointment.status)).length,
  }), [appointments])

  const sortedAppointments = useMemo(() => (
    [...appointments].sort((left, right) => {
      const leftDate = getAppointmentSortDate(left)
      const rightDate = getAppointmentSortDate(right)
      return rightDate - leftDate
    })
  ), [appointments])

  const totalAppointmentPages = useMemo(
    () => Math.max(1, Math.ceil(sortedAppointments.length / appointmentPageSize)),
    [sortedAppointments.length],
  )

  const currentAppointmentPage = useMemo(
    () => Math.min(appointmentPage, totalAppointmentPages),
    [appointmentPage, totalAppointmentPages],
  )

  const paginatedAppointments = useMemo(() => {
    const start = (currentAppointmentPage - 1) * appointmentPageSize
    return sortedAppointments.slice(start, start + appointmentPageSize)
  }, [currentAppointmentPage, sortedAppointments])

  useEffect(() => {
    setAppointmentPage((current) => Math.min(current, totalAppointmentPages))
  }, [totalAppointmentPages])

  const availableTimeSlots = useMemo(() => (
    getAvailableTimeSlots(formData.preferredDate)
  ), [formData.preferredDate])

  useEffect(() => {
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(formData.preferredTimeSlot)) {
      setFormData((current) => ({
        ...current,
        preferredTimeSlot: availableTimeSlots[0],
      }))
    }
  }, [availableTimeSlots, formData.preferredTimeSlot])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'serviceType' && value !== 'Other' ? { customServiceType: '' } : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!formData.vehicleId) {
      setError('Add or select a vehicle before booking a service appointment.')
      return
    }

    setIsSubmitting(true)

    try {
      const createdAppointment = await createMyServiceAppointment(toPayload(formData))
      setAppointments((current) => [createdAppointment, ...current])
      setFormData((current) => ({
        ...initialFormData,
        vehicleId: current.vehicleId,
      }))
      setMessage('Service appointment booked. Staff will review and confirm it.')
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancel(appointment) {
    const reason = window.prompt(`Cancel appointment ${appointment.appointmentNumber}? You can add a reason below.`)
    if (reason === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      await cancelMyServiceAppointment(appointment.serviceAppointmentId, reason)
      setAppointments((current) => current.map((item) => (
        item.serviceAppointmentId === appointment.serviceAppointmentId
          ? {
            ...item,
            status: 'Cancelled',
            cancelledByRole: 'Customer',
            cancellationReason: reason,
            cancelledAt: new Date().toISOString(),
          }
          : item
      )))
      setMessage('Appointment cancelled.')
    } catch (exception) {
      setError(exception.message)
    }
  }

  function hasReviewForAppointment(appointmentId) {
    return reviews.some((review) => review.serviceAppointmentId === appointmentId)
  }

  function openReview(appointment) {
    setError('')
    setMessage('')
    setReviewError('')
    setReviewingAppointment(appointment)
    setReviewDraft({ rating: 5, comment: '' })
  }

  function closeReview() {
    setReviewingAppointment(null)
    setReviewDraft({ rating: 5, comment: '' })
    setReviewError('')
    setIsReviewSubmitting(false)
  }

  async function submitReview(event) {
    event.preventDefault()
    if (!reviewingAppointment) {
      return
    }

    setReviewError('')
    setMessage('')
    setIsReviewSubmitting(true)

    try {
      const createdReview = await createReview({
        serviceAppointmentId: reviewingAppointment.serviceAppointmentId,
        rating: Number(reviewDraft.rating || 5),
        comment: reviewDraft.comment,
      })
      setReviews((current) => [createdReview, ...current])
      setMessage('Thank you for your review!')
      closeReview()
    } catch (exception) {
      setReviewError(exception.message)
    } finally {
      setIsReviewSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Customer</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Book Service</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <CalendarCheck size={22} />
          </span>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Active" value={summary.active} />
          <Metric label="Upcoming" value={summary.upcoming} tone="amber" />
          <Metric label="Completed" value={summary.completed} tone="green" />
        </section>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Vehicle
            <select
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              name="vehicleId"
              required
              value={formData.vehicleId}
              onChange={handleChange}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.customerVehicleId} value={vehicle.customerVehicleId}>
                  {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Service type
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="serviceType"
                required
                value={formData.serviceType}
                onChange={handleChange}
              >
                {serviceTypes.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <TextField
              disabled={formData.serviceType !== 'Other'}
              label="Custom service"
              name="customServiceType"
              onChange={handleChange}
              required={formData.serviceType === 'Other'}
              value={formData.customServiceType}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Preferred date" min={getTodayInputValue()} name="preferredDate" onChange={handleChange} required type="date" value={formData.preferredDate} />
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Preferred time
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="preferredTimeSlot"
                required
                value={formData.preferredTimeSlot}
                onChange={handleChange}
              >
                {availableTimeSlots.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {availableTimeSlots.length === 0 && (
                <span className="text-xs font-bold text-red-600">No slots left for this date. Please choose another date.</span>
              )}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Urgency
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="urgency"
                required
                value={formData.urgency}
                onChange={handleChange}
              >
                {urgencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <TextField label="Current mileage" min="0" name="mileageAtBooking" onChange={handleChange} type="number" value={formData.mileageAtBooking} />
          </div>

          <TextareaField label="Problem / symptoms" name="problemDescription" onChange={handleChange} required value={formData.problemDescription} />
          <TextareaField label="Extra note" name="customerNote" onChange={handleChange} value={formData.customerNote} />

          {error && <Message tone="error">{error}</Message>}
          {message && <Message tone="success">{message}</Message>}

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || isLoading || availableTimeSlots.length === 0}
            type="submit"
          >
            <Send size={18} />
            {isSubmitting ? 'Booking...' : 'Book appointment'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Service Center</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">My Appointments</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <Wrench size={22} />
          </span>
        </div>

        <div className="mt-6 grid gap-4">
          {isLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading appointments...</p>
          ) : sortedAppointments.length > 0 ? paginatedAppointments.map((appointment) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={appointment.serviceAppointmentId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">{appointment.appointmentNumber}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{appointment.displayServiceType}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{appointment.vehicleLabel}</p>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label="Preferred" value={`${formatDate(appointment.preferredDate)} | ${appointment.preferredTimeSlot}`} />
                <Detail label="Urgency" value={appointment.urgency} />
                <Detail label="Problem" value={appointment.problemDescription} />
                <Detail label="Staff note" value={appointment.staffNote || 'Waiting for staff update'} />
              </div>

              {appointment.completionNote && <Message tone="success">{appointment.completionNote}</Message>}
              {appointment.cancellationReason && <Message tone="error">{appointment.cancellationReason}</Message>}

              <div className="mt-4 flex flex-wrap gap-3">
                {['Pending', 'Confirmed'].includes(appointment.status) && (
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-black text-red-700 transition hover:bg-red-50"
                    type="button"
                    onClick={() => handleCancel(appointment)}
                  >
                    <XCircle size={17} />
                    Cancel appointment
                  </button>
                )}

                {appointment.status === 'Completed' && (
                  hasReviewForAppointment(appointment.serviceAppointmentId) ? (
                    <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
                      <Star size={17} />
                      Reviewed
                    </span>
                  ) : (
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
                      type="button"
                      onClick={() => openReview(appointment)}
                    >
                      <MessageSquare size={17} />
                      Write review
                    </button>
                  )
                )}
              </div>
            </article>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No service appointments yet.</p>
          )}
        </div>

        {!isLoading && sortedAppointments.length > appointmentPageSize && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500">
              Showing {(currentAppointmentPage - 1) * appointmentPageSize + 1}-{Math.min(currentAppointmentPage * appointmentPageSize, sortedAppointments.length)} of {sortedAppointments.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentAppointmentPage === 1}
                type="button"
                onClick={() => setAppointmentPage((page) => Math.max(page - 1, 1))}
              >
                <ChevronLeft size={15} />
                Newer
              </button>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                {currentAppointmentPage}/{totalAppointmentPages}
              </span>
              <button
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentAppointmentPage === totalAppointmentPages}
                type="button"
                onClick={() => setAppointmentPage((page) => Math.min(page + 1, totalAppointmentPages))}
              >
                Older
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      {reviewingAppointment && (
        <ReviewModal
          appointment={reviewingAppointment}
          draft={reviewDraft}
          error={reviewError}
          isSubmitting={isReviewSubmitting}
          onChange={(next) => setReviewDraft((current) => ({ ...current, ...next }))}
          onClose={closeReview}
          onSubmit={submitReview}
        />
      )}
    </div>
  )
}

function Metric({ label, value, tone = 'red' }) {
  const toneClass = {
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }[tone]

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function TextField({ disabled = false, label, name, onChange, required = false, type = 'text', value, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        name={name}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
        {...props}
      />
    </label>
  )
}

function TextareaField({ label, name, onChange, required = false, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        maxLength={800}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    Pending: ['bg-amber-50 text-amber-700 border-amber-200', Clock],
    Confirmed: ['bg-sky-50 text-sky-700 border-sky-200', CalendarCheck],
    InProgress: ['bg-blue-50 text-blue-700 border-blue-200', Wrench],
    Completed: ['bg-emerald-50 text-emerald-700 border-emerald-200', CheckCircle2],
    Cancelled: ['bg-slate-100 text-slate-600 border-slate-200', XCircle],
    Rejected: ['bg-red-50 text-red-700 border-red-200', XCircle],
    NoShow: ['bg-slate-100 text-slate-700 border-slate-200', XCircle],
  }[status] ?? ['bg-slate-100 text-slate-700 border-slate-200', Clock]
  const Icon = config[1]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${config[0]}`}>
      <Icon size={14} />
      {status === 'InProgress' ? 'In progress' : status === 'NoShow' ? 'No-show' : status}
    </span>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-4 border-red-200 bg-red-50 text-red-700'
    : 'mt-4 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function toPayload(data) {
  return {
    vehicleId: Number(data.vehicleId),
    serviceType: data.serviceType,
    customServiceType: data.customServiceType,
    urgency: data.urgency,
    preferredDate: data.preferredDate,
    preferredTimeSlot: data.preferredTimeSlot,
    mileageAtBooking: data.mileageAtBooking ? Number(data.mileageAtBooking) : null,
    problemDescription: data.problemDescription,
    customerNote: data.customerNote,
  }
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getAvailableTimeSlots(preferredDate) {
  if (!isToday(preferredDate)) {
    return timeSlots
  }

  const now = new Date()
  return timeSlots.filter((slot) => {
    const endTime = parseSlotEndTime(slot)
    if (!endTime) {
      return true
    }

    return endTime > now
  })
}

function parseSlotEndTime(slot) {
  const endLabel = slot.split('-').at(1)?.trim()
  if (!endLabel) {
    return null
  }

  const match = endLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) {
    return null
  }

  const date = new Date()
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3].toUpperCase()

  if (period === 'PM' && hours !== 12) {
    hours += 12
  }

  if (period === 'AM' && hours === 12) {
    hours = 0
  }

  date.setHours(hours, minutes, 0, 0)
  return date
}

function isToday(value) {
  return value === getTodayInputValue()
}

function formatDate(value) {
  if (!value) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getAppointmentSortDate(appointment) {
  const candidates = [appointment?.createdAt, appointment?.preferredDate, appointment?.updatedAt]
  for (const value of candidates) {
    const timestamp = Date.parse(value)
    if (!Number.isNaN(timestamp)) {
      return timestamp
    }
  }
  return 0
}

function ReviewModal({ appointment, draft, error, isSubmitting, onChange, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-8">
      <section className="w-full max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Review booking</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{appointment.displayServiceType}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{appointment.appointmentNumber} • {appointment.vehicleLabel}</p>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            type="button"
            aria-label="Close review"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form className="grid gap-5 bg-slate-50 px-5 py-5" onSubmit={onSubmit}>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-500">Rating</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black transition ${
                    star <= draft.rating
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  type="button"
                  onClick={() => onChange({ rating: star })}
                >
                  <Star size={18} fill={star <= draft.rating ? 'currentColor' : 'none'} />
                  {star}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
            Comment
            <textarea
              className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              minLength={10}
              maxLength={1000}
              required
              value={draft.comment}
              onChange={(event) => onChange({ comment: event.target.value })}
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              <Send size={18} />
              {isSubmitting ? 'Submitting...' : 'Submit review'}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
