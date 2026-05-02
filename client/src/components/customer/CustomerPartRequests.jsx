import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, PackageSearch, Send, X } from 'lucide-react'
import {
  cancelMyPartRequest,
  createMyPartRequest,
  getMyPartRequests,
  getMyVehicles,
  getParts,
} from '../../lib/auth'

const urgencyOptions = ['Low', 'Normal', 'High', 'Urgent']
const requestPageSize = 2

const initialFormData = {
  mode: 'existing',
  vehicleId: '',
  requestedPartId: '',
  partName: '',
  partNumber: '',
  description: '',
  quantity: '1',
  urgency: 'Normal',
}

export function CustomerPartRequests() {
  const [formData, setFormData] = useState(initialFormData)
  const [parts, setParts] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [requests, setRequests] = useState([])
  const [requestPage, setRequestPage] = useState(1)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [partData, vehicleData, requestData] = await Promise.all([
          getParts(),
          getMyVehicles(),
          getMyPartRequests(),
        ])

        if (isMounted) {
          setParts(partData)
          setVehicles(vehicleData)
          setRequests(requestData)
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

  const availableParts = useMemo(() => (
    parts.filter((part) => part.quantityInStock > 0)
  ), [parts])

  const filteredParts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return availableParts.slice(0, 8)
    }

    return availableParts
      .filter((part) => [
        part.name,
        part.partNumber,
        part.brand,
        part.category,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery)))
      .slice(0, 12)
  }, [availableParts, query])

  const totalRequestPages = Math.max(1, Math.ceil(requests.length / requestPageSize))
  const currentRequestPage = Math.min(requestPage, totalRequestPages)
  const paginatedRequests = requests.slice(
    (currentRequestPage - 1) * requestPageSize,
    currentRequestPage * requestPageSize,
  )

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'mode' ? { requestedPartId: '', partName: '', partNumber: '', description: '' } : {}),
    }))
  }

  function selectPart(part) {
    setFormData((current) => ({
      ...current,
      requestedPartId: String(part.partId),
    }))
    setQuery(`${part.name} (${part.partNumber})`)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (formData.mode === 'existing' && !formData.requestedPartId) {
      setError('Select an available part before submitting the request.')
      return
    }

    setIsSubmitting(true)

    try {
      const createdRequest = await createMyPartRequest(toPayload(formData))
      setRequests((current) => [createdRequest, ...current])
      setRequestPage(1)
      setFormData(initialFormData)
      setQuery('')
      setMessage('Part request submitted.')
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancel(partRequest) {
    const shouldCancel = window.confirm(`Cancel request for ${partRequest.partName}?`)
    if (!shouldCancel) {
      return
    }

    setError('')
    setMessage('')

    try {
      await cancelMyPartRequest(partRequest.partRequestId)
      setRequests((current) => current.map((request) => (
        request.partRequestId === partRequest.partRequestId
          ? { ...request, status: 'Cancelled', resolvedAt: new Date().toISOString() }
          : request
      )))
      setMessage('Part request cancelled.')
    } catch (exception) {
      setError(exception.message)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Customer</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Request a Part</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <PackageSearch size={22} />
          </span>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <ModeButton active={formData.mode === 'existing'} label="Available part" onClick={() => handleChange({ target: { name: 'mode', value: 'existing' } })} />
            <ModeButton active={formData.mode === 'custom'} label="Custom request" onClick={() => handleChange({ target: { name: 'mode', value: 'custom' } })} />
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Vehicle
            <select
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleChange}
            >
              <option value="">No vehicle selected</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.customerVehicleId} value={vehicle.customerVehicleId}>
                  {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </label>

          {formData.mode === 'existing' ? (
            <section className="grid gap-3">
              <TextField label="Search available parts" name="query" onChange={(event) => setQuery(event.target.value)} value={query} />
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {filteredParts.length > 0 ? filteredParts.map((part) => {
                  const isSelected = formData.requestedPartId === String(part.partId)
                  return (
                    <button
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        isSelected ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      key={part.partId}
                      type="button"
                      onClick={() => selectPart(part)}
                    >
                      <p className="text-sm font-black text-slate-950">{part.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {part.partNumber} | Stock {part.quantityInStock} | Rs. {formatMoney(part.sellingPrice)}
                      </p>
                    </button>
                  )
                }) : (
                  <p className="px-3 py-4 text-sm font-semibold text-slate-600">No available parts found.</p>
                )}
              </div>
            </section>
          ) : (
            <section className="grid gap-4">
              <TextField label="Part name" name="partName" onChange={handleChange} required value={formData.partName} />
              <TextField label="Part number" name="partNumber" onChange={handleChange} value={formData.partNumber} />
              <TextareaField label="Description" name="description" onChange={handleChange} required value={formData.description} />
            </section>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Quantity" min="1" name="quantity" onChange={handleChange} required type="number" value={formData.quantity} />
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
          </div>

          {error && <Message tone="error">{error}</Message>}
          {message && <Message tone="success">{message}</Message>}

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <Send size={18} />
            {isSubmitting ? 'Submitting...' : 'Submit request'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Request history</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">My Part Requests</h2>
          </div>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
            2 per page
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading requests...</p>
          ) : requests.length > 0 ? paginatedRequests.map((request) => (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={request.partRequestId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-950">{request.partName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {request.partNumber || 'No part number'} | Qty {request.quantity} | {request.urgency}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
              {request.vehicleLabel && <p className="mt-3 text-sm font-semibold text-slate-600">{request.vehicleLabel}</p>}
              {request.description && <p className="mt-3 text-sm font-semibold text-slate-700">{request.description}</p>}
              {request.staffNote && (
                <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  Staff note: {request.staffNote}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-500">{formatDate(request.createdAt)}</p>
                {request.status === 'Pending' && (
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-black text-red-600 transition hover:bg-red-50"
                    type="button"
                    onClick={() => handleCancel(request)}
                  >
                    <X size={15} />
                    Cancel
                  </button>
                )}
              </div>
            </article>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No part requests yet.</p>
          )}
        </div>

        {!isLoading && requests.length > requestPageSize && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500">
              Showing {(currentRequestPage - 1) * requestPageSize + 1}-{Math.min(currentRequestPage * requestPageSize, requests.length)} of {requests.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentRequestPage === 1}
                type="button"
                onClick={() => setRequestPage((page) => Math.max(page - 1, 1))}
              >
                <ChevronLeft size={15} />
                Newer
              </button>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                {currentRequestPage}/{totalRequestPages}
              </span>
              <button
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentRequestPage === totalRequestPages}
                type="button"
                onClick={() => setRequestPage((page) => Math.min(page + 1, totalRequestPages))}
              >
                Older
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function toPayload(data) {
  const payload = {
    vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
    quantity: Number.parseInt(data.quantity, 10),
    urgency: data.urgency,
  }

  if (data.mode === 'existing') {
    return {
      ...payload,
      requestedPartId: data.requestedPartId ? Number(data.requestedPartId) : null,
    }
  }

  return {
    ...payload,
    requestedPartId: null,
    partName: data.partName,
    partNumber: data.partNumber,
    description: data.description,
  }
}

function ModeButton({ active, label, onClick }) {
  return (
    <button
      className={`min-h-11 rounded-lg border px-3 text-sm font-black transition ${
        active ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function TextField({ label, name, onChange, value, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        onChange={onChange}
        value={value}
        {...props}
      />
    </label>
  )
}

function TextareaField({ label, name, onChange, value, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        maxLength={500}
        name={name}
        onChange={onChange}
        value={value}
        {...props}
      />
    </label>
  )
}

function StatusBadge({ status }) {
  const config = {
    Pending: ['bg-amber-50 text-amber-700 border-amber-200', Clock],
    Available: ['bg-emerald-50 text-emerald-700 border-emerald-200', CheckCircle2],
    Invoiced: ['bg-emerald-50 text-emerald-700 border-emerald-200', CheckCircle2],
    Unavailable: ['bg-slate-100 text-slate-700 border-slate-200', AlertCircle],
    Rejected: ['bg-red-50 text-red-700 border-red-200', AlertCircle],
    Cancelled: ['bg-slate-100 text-slate-600 border-slate-200', X],
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
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function formatMoney(value) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value || 0))
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
