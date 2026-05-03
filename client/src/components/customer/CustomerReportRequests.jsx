import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, FileText, Send } from 'lucide-react'
import {
  createMyCustomerReportRequest,
  getMyCustomerReportRequests,
} from '../../lib/auth'

const reportTypeOptions = [
  { label: 'Sales + Services', value: 'Combined' },
  { label: 'Sales only', value: 'SalesOnly' },
  { label: 'Services only', value: 'ServicesOnly' },
]

export function CustomerReportRequests() {
  const [formData, setFormData] = useState({
    reportType: 'Combined',
    notes: '',
  })
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadRequests() {
      try {
        const data = await getMyCustomerReportRequests()
        if (isMounted) {
          setRequests(data)
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

    loadRequests()

    return () => {
      isMounted = false
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const hasSimilarPendingRequest = requests.some((request) => (
      request.status === 'Pending' && request.reportType === formData.reportType
    ))

    if (hasSimilarPendingRequest) {
      const shouldSendAgain = window.confirm(
        `You already sent a pending ${formatReportType(formData.reportType)} report request. Do you want to send it again?`,
      )

      if (!shouldSendAgain) {
        return
      }
    }

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const createdRequest = await createMyCustomerReportRequest(formData)
      setRequests((current) => [createdRequest, ...current])
      setFormData({ reportType: 'Combined', notes: '' })
      setIsRequestOpen(false)
      setMessage('Report request sent to staff.')
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'Pending').length
  const sentCount = requests.filter((request) => request.status === 'Sent').length

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PanelTitle kicker="Reports" title="Request customer report" />
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={() => setIsRequestOpen((current) => !current)}
          >
            <Send size={18} />
            {isRequestOpen ? 'Close request' : 'Request report'}
          </button>
        </div>

        {error && <Message tone="error">{error}</Message>}
        {message && <Message>{message}</Message>}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Total requests" value={requests.length} />
          <SummaryTile label="Pending" value={pendingCount} tone="amber" />
          <SummaryTile label="Sent" value={sentCount} tone="emerald" />
        </div>

        {isRequestOpen && (
          <form className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Report type
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="reportType"
                value={formData.reportType}
                onChange={handleChange}
              >
                {reportTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Notes
              <textarea
                className="min-h-32 resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional message for staff"
              />
            </label>

            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              <Send size={18} />
              {isSubmitting ? 'Sending...' : 'Send request'}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <PanelTitle kicker="History" title="Report request timeline" />

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-600">Loading report requests...</p>
          ) : requests.length > 0 ? requests.map((request) => (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-white" key={request.customerReportRequestId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-black text-slate-950">{formatReportType(request.reportType)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Requested {formatDate(request.createdAt)}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
              {request.notes && (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                  {request.notes}
                </p>
              )}
              {request.staffNote && (
                <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {request.staffNote}
                </p>
              )}
            </article>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600">No report requests yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function PanelTitle({ kicker, title }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
        <FileText size={22} />
      </span>
      <div>
        <p className="text-xs font-black uppercase text-[var(--primary)]">{kicker}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
    </div>
  )
}

function SummaryTile({ label, tone = 'red', value }) {
  const toneClass = {
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
    red: 'text-[var(--primary)]',
  }[tone]

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const isSent = status === 'Sent'
  const Icon = isSent ? CheckCircle2 : Clock

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${
      isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}>
      <Icon size={14} />
      {status}
    </span>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-5 border-red-200 bg-red-50 text-red-700'
    : 'mt-5 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function formatReportType(value) {
  return {
    SalesOnly: 'Sales only',
    ServicesOnly: 'Services only',
    Combined: 'Sales + Services',
  }[value] ?? 'Sales + Services'
}

function formatDate(value) {
  if (!value) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
