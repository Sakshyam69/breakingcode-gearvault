import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, FilePlus2, PackageSearch, RefreshCw, Save, Search, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPartRequests, updatePartRequestStatus } from '../../lib/auth'

const statuses = ['', 'Pending', 'Available', 'Unavailable', 'Rejected', 'Invoiced', 'Cancelled']
const updateStatuses = ['Pending', 'Available', 'Unavailable', 'Rejected']

export function StaffPartRequestManagement() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [updateData, setUpdateData] = useState({ status: 'Available', staffNote: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.status === 'Pending').length,
    available: requests.filter((request) => request.status === 'Available').length,
    closed: requests.filter((request) => ['Rejected', 'Unavailable', 'Invoiced', 'Cancelled'].includes(request.status)).length,
  }), [requests])

  async function loadRequests(nextQuery = query, nextStatus = status) {
    setError('')
    setIsLoading(true)

    try {
      const data = await getPartRequests({ query: nextQuery, status: nextStatus })
      setRequests(data)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleQueryChange(value) {
    setQuery(value)
    loadRequests(value, status)
  }

  function handleStatusChange(value) {
    setStatus(value)
    loadRequests(query, value)
  }

  function selectRequest(request) {
    setSelectedRequest(request)
    setUpdateData({
      status: request.status === 'Cancelled' ? 'Pending' : request.status,
      staffNote: request.staffNote ?? '',
    })
    setMessage('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!selectedRequest) {
      return
    }

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const updatedRequest = await updatePartRequestStatus(selectedRequest.partRequestId, updateData)
      setRequests((current) => current.map((request) => (
        request.partRequestId === updatedRequest.partRequestId ? updatedRequest : request
      )))
      setSelectedRequest(updatedRequest)
      setMessage('Part request updated and customer notified.')
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function openInvoiceFlow(request) {
    navigate('/staff/sales-invoices', { state: { partRequest: request } })
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Total" value={summary.total} />
        <Metric label="Pending" value={summary.pending} tone="amber" />
        <Metric label="Available" value={summary.available} tone="green" />
        <Metric label="Closed" value={summary.closed} tone="slate" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Staff</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Part Request Queue</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_190px_auto]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                placeholder="Search requests"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
              />
            </label>
            <select
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              value={status}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              {statuses.map((option) => (
                <option key={option || 'all'} value={option}>
                  {option || 'All statuses'}
                </option>
              ))}
            </select>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={() => loadRequests()}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </div>

        {error && <Message tone="error">{error}</Message>}
        {message && <Message tone="success">{message}</Message>}

        <div className={`mt-5 grid gap-5 ${selectedRequest ? 'xl:grid-cols-[minmax(0,1fr)_420px]' : ''}`}>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm font-semibold text-slate-600" colSpan={7}>Loading requests...</td>
                  </tr>
                ) : requests.length > 0 ? requests.map((request) => {
                  const isSelected = selectedRequest?.partRequestId === request.partRequestId
                  return (
                    <tr
                      className={`cursor-pointer transition ${isSelected ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                      key={request.partRequestId}
                      onClick={() => selectRequest(request)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-950">{request.partName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{request.partNumber || 'No part number'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{request.customerName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{request.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{request.quantity}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{request.urgency}</td>
                      <td className="px-4 py-3"><StatusBadge status={request.status} /></td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(request.createdAt)}</td>
                      <td className="px-4 py-3">
                        {request.status === 'Available' ? (
                          <button
                            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openInvoiceFlow(request)
                            }}
                          >
                            <FilePlus2 size={15} />
                            Invoice
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td className="px-4 py-6 text-sm font-semibold text-slate-600" colSpan={7}>No part requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedRequest && (
            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-red-600">Request #{selectedRequest.partRequestId}</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{selectedRequest.partName}</h3>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
                  <PackageSearch size={22} />
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <Detail label="Customer" value={`${selectedRequest.customerName} (${selectedRequest.customerPhone || selectedRequest.customerEmail})`} />
                <Detail label="Vehicle" value={selectedRequest.vehicleLabel || 'No vehicle selected'} />
                <Detail label="Part number" value={selectedRequest.partNumber || 'Not provided'} />
                <Detail label="Description" value={selectedRequest.description || 'No description'} />
              </div>

              {!selectedRequest.requestedPartId && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  Custom part request: create the invoice after selecting the matching inventory part on the invoice page.
                </p>
              )}

              <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Status
                  <select
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                    value={updateData.status}
                    onChange={(event) => setUpdateData((current) => ({ ...current, status: event.target.value }))}
                  >
                    {updateStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Staff note
                  <textarea
                    className="min-h-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                    maxLength={500}
                    value={updateData.staffNote}
                    onChange={(event) => setUpdateData((current) => ({ ...current, staffNote: event.target.value }))}
                  />
                </label>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || selectedRequest.status === 'Cancelled' || selectedRequest.status === 'Invoiced'}
                  type="submit"
                >
                  <Save size={18} />
                  {isSubmitting ? 'Saving...' : 'Update request'}
                </button>
                {selectedRequest.status === 'Available' && (
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
                    type="button"
                    onClick={() => openInvoiceFlow(selectedRequest)}
                  >
                    <FilePlus2 size={18} />
                    Create invoice
                  </button>
                )}
                {selectedRequest.status !== 'Available'
                  && selectedRequest.status !== 'Invoiced'
                  && selectedRequest.status !== 'Cancelled'
                  && updateData.status === 'Available' && (
                    <button
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-4 py-2 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => {
                        setIsSubmitting(true)
                        setError('')
                        setMessage('')
                        try {
                          const updatedRequest = await updatePartRequestStatus(selectedRequest.partRequestId, updateData)
                          setRequests((current) => current.map((request) => (
                            request.partRequestId === updatedRequest.partRequestId ? updatedRequest : request
                          )))
                          setSelectedRequest(updatedRequest)
                          openInvoiceFlow(updatedRequest)
                        } catch (exception) {
                          setError(exception.message)
                        } finally {
                          setIsSubmitting(false)
                        }
                      }}
                    >
                      <FilePlus2 size={18} />
                      Save availability & create invoice
                    </button>
                  )}
              </form>
            </aside>
          )}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone = 'red' }) {
  const toneClass = {
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }[tone]

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
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
    Available: ['bg-emerald-50 text-emerald-700 border-emerald-200', CheckCircle2],
    Invoiced: ['bg-emerald-50 text-emerald-700 border-emerald-200', CheckCircle2],
    Unavailable: ['bg-slate-100 text-slate-700 border-slate-200', XCircle],
    Rejected: ['bg-red-50 text-red-700 border-red-200', XCircle],
    Cancelled: ['bg-slate-100 text-slate-600 border-slate-200', XCircle],
  }[status] ?? ['bg-slate-100 text-slate-700 border-slate-200', Clock]
  const Icon = config[1]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${config[0]}`}>
      <Icon size={14} />
      {status === 'Invoiced' ? 'Invoice created' : status}
    </span>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-5 border-red-200 bg-red-50 text-red-700'
    : 'mt-5 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
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
