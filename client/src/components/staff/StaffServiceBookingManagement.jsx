import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, Clock, Eye, FilePlus2, RefreshCw, Save, Search, Wrench, XCircle } from 'lucide-react'
import { createBookingInvoice, getServiceAppointments, updateServiceAppointmentStatus } from '../../lib/auth'

const filterStatuses = ['', 'Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled', 'Rejected', 'NoShow']
const updateStatuses = ['Pending', 'Confirmed', 'InProgress', 'Completed', 'Rejected', 'Cancelled', 'NoShow']
const initialInvoiceData = {
  serviceAppointmentId: '',
  serviceCharge: '',
  discountAmount: '',
  taxAmount: '',
  paidAmount: '',
  customerCreditAppliedAmount: '',
  paymentMethod: 'Cash',
  dueDate: '',
  workSummary: '',
  diagnosisNote: '',
  recommendationNote: '',
  notes: '',
}

export function StaffServiceBookingManagement() {
  const [appointments, setAppointments] = useState([])
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [invoiceAppointment, setInvoiceAppointment] = useState(null)
  const [invoiceData, setInvoiceData] = useState(initialInvoiceData)
  const [statusDrafts, setStatusDrafts] = useState({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

  useEffect(() => {
    loadAppointments()
  }, [])

  const summary = useMemo(() => ({
    total: appointments.length,
    pending: appointments.filter((appointment) => appointment.status === 'Pending').length,
    active: appointments.filter((appointment) => ['Confirmed', 'InProgress'].includes(appointment.status)).length,
    completed: appointments.filter((appointment) => appointment.status === 'Completed').length,
  }), [appointments])

  async function loadAppointments(nextQuery = query, nextStatus = status, nextDate = date) {
    setError('')
    setIsLoading(true)

    try {
      const data = await getServiceAppointments({
        query: nextQuery,
        status: nextStatus,
        date: nextDate ? new Date(`${nextDate}T00:00:00`).toISOString() : '',
      })
      setAppointments(data)
      setStatusDrafts(Object.fromEntries(data.map((appointment) => [
        appointment.serviceAppointmentId,
        appointment.status,
      ])))
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleQueryChange(value) {
    setQuery(value)
    loadAppointments(value, status, date)
  }

  function handleStatusFilterChange(value) {
    setStatus(value)
    loadAppointments(query, value, date)
  }

  function handleDateChange(value) {
    setDate(value)
    loadAppointments(query, status, value)
  }

  async function updateStatus(appointment, nextStatus = statusDrafts[appointment.serviceAppointmentId] ?? appointment.status) {
    if (nextStatus === appointment.status) {
      setMessage('No status change selected.')
      return
    }

    setError('')
    setMessage('')
    setUpdatingId(appointment.serviceAppointmentId)

    try {
      const updatedAppointment = await updateServiceAppointmentStatus(appointment.serviceAppointmentId, {
        status: nextStatus,
        assignedStaffId: appointment.assignedStaffId ?? null,
        scheduledStartAt: appointment.scheduledStartAt ?? null,
        scheduledEndAt: appointment.scheduledEndAt ?? null,
        staffNote: appointment.staffNote ?? '',
        diagnosisNote: appointment.diagnosisNote ?? '',
        completionNote: appointment.completionNote ?? '',
        cancellationReason: appointment.cancellationReason ?? '',
      })

      setAppointments((current) => current.map((item) => (
        item.serviceAppointmentId === updatedAppointment.serviceAppointmentId ? updatedAppointment : item
      )))
      setStatusDrafts((current) => ({
        ...current,
        [updatedAppointment.serviceAppointmentId]: updatedAppointment.status,
      }))
      setSelectedAppointment((current) => (
        current?.serviceAppointmentId === updatedAppointment.serviceAppointmentId ? updatedAppointment : current
      ))
      setMessage(`Booking ${updatedAppointment.appointmentNumber} changed to ${formatStatusLabel(updatedAppointment.status)}.`)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setUpdatingId(null)
    }
  }

  function openInvoiceFlow(appointment) {
    setInvoiceAppointment(appointment)
    setInvoiceData({
      ...initialInvoiceData,
      serviceAppointmentId: appointment.serviceAppointmentId,
      workSummary: `Service completed for ${appointment.displayServiceType}.`,
      diagnosisNote: appointment.diagnosisNote || '',
      notes: buildBookingInvoiceNotes(appointment),
    })
    setError('')
    setMessage('')
  }

  async function handleCreateBookingInvoice(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsCreatingInvoice(true)

    try {
      const createdInvoice = await createBookingInvoice(toBookingInvoicePayload(invoiceData))
      setMessage(createdInvoice.emailSent
        ? `Booking invoice ${createdInvoice.invoiceNumber} created and emailed to the customer.`
        : `Booking invoice ${createdInvoice.invoiceNumber} created, but email was not sent. Check Brevo settings.`)
      setAppointments((current) => current.map((appointment) => (
        appointment.serviceAppointmentId === createdInvoice.serviceAppointmentId
          ? { ...appointment, hasBookingInvoice: true }
          : appointment
      )))
      setInvoiceAppointment(null)
      setInvoiceData(initialInvoiceData)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Total" value={summary.total} />
        <Metric label="Pending" value={summary.pending} tone="amber" />
        <Metric label="Active" value={summary.active} tone="blue" />
        <Metric label="Completed" value={summary.completed} tone="green" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Staff</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Service Booking Queue</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_170px_160px_auto]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                placeholder="Search bookings"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
              />
            </label>
            <select
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              value={status}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
            >
              {filterStatuses.map((option) => (
                <option key={option || 'all'} value={option}>
                  {option ? formatStatusLabel(option) : 'All statuses'}
                </option>
              ))}
            </select>
            <input
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              type="date"
              value={date}
              onChange={(event) => handleDateChange(event.target.value)}
            />
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={() => loadAppointments()}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </div>

        {error && <Message tone="error">{error}</Message>}
        {message && <Message tone="success">{message}</Message>}

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[1120px] divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Preferred</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Change Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm font-semibold text-slate-600" colSpan={8}>Loading bookings...</td>
                  </tr>
                ) : appointments.length > 0 ? appointments.map((appointment) => {
                  const isClosed = ['Cancelled', 'Rejected', 'NoShow'].includes(appointment.status)
                  const isUpdating = updatingId === appointment.serviceAppointmentId
                  const draftStatus = statusDrafts[appointment.serviceAppointmentId] ?? appointment.status

                  return (
                    <tr className="align-top transition hover:bg-slate-50" key={appointment.serviceAppointmentId}>
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-950">{appointment.displayServiceType}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{appointment.appointmentNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{appointment.customerName}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{appointment.customerPhone || appointment.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{appointment.vehicleNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">{formatDate(appointment.preferredDate)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{appointment.preferredTimeSlot}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{appointment.urgency}</td>
                      <td className="px-4 py-3"><StatusBadge status={appointment.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            className="min-h-9 w-36 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400"
                            disabled={isClosed || appointment.status === 'Completed'}
                            value={draftStatus}
                            onChange={(event) => setStatusDrafts((current) => ({
                              ...current,
                              [appointment.serviceAppointmentId]: event.target.value,
                            }))}
                          >
                            {updateStatuses.map((option) => (
                              <option key={option} value={option}>{formatStatusLabel(option)}</option>
                            ))}
                          </select>
                          <button
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isClosed || appointment.status === 'Completed' || draftStatus === appointment.status || isUpdating}
                            type="button"
                            title="Save status"
                            onClick={() => updateStatus(appointment, draftStatus)}
                          >
                            <Save size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                            type="button"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <Eye size={15} />
                            Details
                          </button>
                          {appointment.status === 'Completed' && !appointment.hasBookingInvoice && (
                            <button
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                              type="button"
                              onClick={() => openInvoiceFlow(appointment)}
                            >
                              <FilePlus2 size={15} />
                              Invoice
                            </button>
                          )}
                          {appointment.hasBookingInvoice && (
                            <span className="inline-flex min-h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                              Invoiced
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td className="px-4 py-6 text-sm font-semibold text-slate-600" colSpan={8}>No service bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </section>

      {selectedAppointment && (
        <BookingDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onCreateInvoice={openInvoiceFlow}
        />
      )}

      {invoiceAppointment && (
        <BookingInvoiceModal
          appointment={invoiceAppointment}
          formData={invoiceData}
          isSubmitting={isCreatingInvoice}
          onChange={(event) => {
            const { name, value } = event.target
            setInvoiceData((current) => ({ ...current, [name]: value }))
          }}
          onClose={() => setInvoiceAppointment(null)}
          onSubmit={handleCreateBookingInvoice}
        />
      )}
    </div>
  )
}

function Metric({ label, value, tone = 'red' }) {
  const toneClass = {
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || 'Not set'}</p>
    </div>
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

function TextareaField({ label, name, onChange, required = false, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        maxLength={1000}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function SummaryRow({ label, strong = false, value }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-slate-950' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
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
      {formatStatusLabel(status)}
    </span>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-5 border-red-200 bg-red-50 text-red-700'
    : 'mt-5 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function BookingInvoiceModal({
  appointment,
  formData,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}) {
  const total = Math.max(
    Number(formData.serviceCharge || 0) - Number(formData.discountAmount || 0) + Number(formData.taxAmount || 0),
    0,
  )
  const creditBalance = Number(appointment.customerCreditBalance || 0)
  const maxCreditForInvoice = Math.min(creditBalance, total)
  const rawCustomerCreditApplied = Number(formData.customerCreditAppliedAmount || 0)
  const customerCreditApplied = clampAmount(rawCustomerCreditApplied, 0, maxCreditForInvoice)
  const payable = Math.max(total - customerCreditApplied, 0)
  const credit = Math.max(payable - Number(formData.paidAmount || 0), 0)
  const returnAmount = Math.max(Number(formData.paidAmount || 0) - payable, 0)

  useEffect(() => {
    if (rawCustomerCreditApplied !== customerCreditApplied) {
      onChange({
        target: {
          name: 'customerCreditAppliedAmount',
          value: String(customerCreditApplied),
        },
      })
    }
  }, [customerCreditApplied, onChange, rawCustomerCreditApplied])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-emerald-600">Booking Invoice</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{appointment.displayServiceType}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{appointment.appointmentNumber} | {appointment.vehicleLabel}</p>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            type="button"
            aria-label="Close invoice form"
            onClick={onClose}
          >
            <XCircle size={20} />
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
            Available customer credit: {formatMoney(creditBalance)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Service charge" min="0.01" name="serviceCharge" onChange={onChange} required step="0.01" type="number" value={formData.serviceCharge} />
            <TextField label="Paid amount" min="0" name="paidAmount" onChange={onChange} step="0.01" type="number" value={formData.paidAmount} />
            <TextField label="Discount" min="0" name="discountAmount" onChange={onChange} step="0.01" type="number" value={formData.discountAmount} />
            <TextField label="Tax" min="0" name="taxAmount" onChange={onChange} step="0.01" type="number" value={formData.taxAmount} />
            <div className="grid gap-2">
              <TextField
                label="Use customer credit"
                max={maxCreditForInvoice}
                min="0"
                name="customerCreditAppliedAmount"
                onChange={onChange}
                step="0.01"
                type="number"
                value={formData.customerCreditAppliedAmount}
              />
              <div className="flex flex-wrap gap-2">
                <ShortcutButton label="0%" onClick={() => setCustomerCredit(onChange, 0)} />
                <ShortcutButton label="50%" onClick={() => setCustomerCredit(onChange, roundMoney(maxCreditForInvoice * 0.5))} />
                <ShortcutButton label="100%" onClick={() => setCustomerCredit(onChange, roundMoney(maxCreditForInvoice))} />
              </div>
              <label className="grid gap-2 text-xs font-bold uppercase text-slate-500">
                Drag to apply credit
                <input
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--primary)]"
                  type="range"
                  min={0}
                  max={Math.max(Math.ceil(maxCreditForInvoice), 0)}
                  step={1}
                  value={Math.max(Math.floor(customerCreditApplied), 0)}
                  onChange={(event) => setCustomerCredit(onChange, event.target.value)}
                />
              </label>
              <p className="text-xs font-bold text-slate-500">
                Max usable credit for this invoice: {formatMoney(maxCreditForInvoice)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Payment method
              <select
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={onChange}
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
                <option value="Credit">Credit</option>
              </select>
            </label>
            <TextField label="Due date" name="dueDate" onChange={onChange} type="date" value={formData.dueDate} />
          </div>

          <TextareaField label="Work summary" name="workSummary" onChange={onChange} required value={formData.workSummary} />
          <TextareaField label="Diagnosis note" name="diagnosisNote" onChange={onChange} value={formData.diagnosisNote} />
          <TextareaField label="Recommendation / future reference" name="recommendationNote" onChange={onChange} value={formData.recommendationNote} />
          <TextareaField label="Extra notes" name="notes" onChange={onChange} value={formData.notes} />

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
            <SummaryRow label="Total" value={formatMoney(total)} strong />
            <SummaryRow label="Customer credit used" value={formatMoney(customerCreditApplied)} />
            <SummaryRow label="Credit after paid amount" value={formatMoney(credit)} />
            <SummaryRow label="Return / saved credit" value={formatMoney(returnAmount)} />
          </div>

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <FilePlus2 size={18} />
            {isSubmitting ? 'Creating...' : 'Create booking invoice'}
          </button>
        </form>
      </section>
    </div>
  )
}

function ShortcutButton({ label, onClick }) {
  return (
    <button
      className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function setCustomerCredit(onChange, value) {
  onChange({
    target: {
      name: 'customerCreditAppliedAmount',
      value: String(value),
    },
  })
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function clampAmount(value, min, max) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return Math.min(Math.max(numeric, min), max)
}

function BookingDetailsModal({ appointment, onClose, onCreateInvoice }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">{appointment.appointmentNumber}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{appointment.displayServiceType}</h2>
            <div className="mt-3"><StatusBadge status={appointment.status} /></div>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            type="button"
            aria-label="Close booking details"
            onClick={onClose}
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Detail label="Customer" value={appointment.customerName} />
          <Detail label="Contact" value={appointment.customerPhone || appointment.customerEmail} />
          <Detail label="Vehicle" value={appointment.vehicleLabel} />
          <Detail label="Vehicle number" value={appointment.vehicleNumber} />
          <Detail label="Preferred date" value={formatDate(appointment.preferredDate)} />
          <Detail label="Preferred time" value={appointment.preferredTimeSlot} />
          <Detail label="Urgency" value={appointment.urgency} />
          <Detail label="Mileage at booking" value={appointment.mileageAtBooking ? `${appointment.mileageAtBooking} km` : 'Not recorded'} />
          <Detail label="Assigned staff" value={appointment.assignedStaffName || 'Not assigned'} />
          <Detail label="Created" value={formatDateTime(appointment.createdAt)} />
          <Detail label="Scheduled start" value={formatDateTime(appointment.scheduledStartAt)} />
          <Detail label="Scheduled end" value={formatDateTime(appointment.scheduledEndAt)} />
        </div>

        <div className="mt-4 grid gap-4">
          <Detail label="Problem / symptoms" value={appointment.problemDescription} />
          <Detail label="Customer note" value={appointment.customerNote || 'No note'} />
          <Detail label="Staff note" value={appointment.staffNote || 'No note added'} />
          <Detail label="Diagnosis note" value={appointment.diagnosisNote || 'No diagnosis recorded'} />
          <Detail label="Completion note" value={appointment.completionNote || 'No completion note recorded'} />
          {(appointment.cancellationReason || appointment.cancelledByRole) && (
            <Detail label="Cancellation / rejection" value={`${appointment.cancelledByRole || 'Staff'}: ${appointment.cancellationReason || 'No reason recorded'}`} />
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
          {appointment.status === 'Completed' && !appointment.hasBookingInvoice && (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
              type="button"
              onClick={() => onCreateInvoice(appointment)}
            >
              <FilePlus2 size={18} />
              Create service invoice
            </button>
          )}
          {appointment.hasBookingInvoice && (
            <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
              Service invoice already created
            </span>
          )}
        </div>
      </section>
    </div>
  )
}

function formatStatusLabel(status) {
  return status === 'InProgress' ? 'In progress' : status === 'NoShow' ? 'No-show' : status
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

function formatDateTime(value) {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function toBookingInvoicePayload(data) {
  return {
    serviceAppointmentId: Number(data.serviceAppointmentId),
    serviceCharge: Number(data.serviceCharge || 0),
    discountAmount: Number(data.discountAmount || 0),
    taxAmount: Number(data.taxAmount || 0),
    paidAmount: Number(data.paidAmount || 0),
    customerCreditAppliedAmount: Number(data.customerCreditAppliedAmount || 0),
    paymentMethod: data.paymentMethod,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    workSummary: data.workSummary,
    diagnosisNote: data.diagnosisNote,
    recommendationNote: data.recommendationNote,
    notes: data.notes,
  }
}

function buildBookingInvoiceNotes(appointment) {
  return [
    `Booking: ${appointment.appointmentNumber}`,
    `Vehicle: ${appointment.vehicleLabel}`,
    `Problem: ${appointment.problemDescription || 'Not recorded'}`,
    appointment.customerNote ? `Customer note: ${appointment.customerNote}` : '',
  ].filter(Boolean).join('\n').slice(0, 1000)
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-NP', {
    currency: 'NPR',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value || 0))
}
