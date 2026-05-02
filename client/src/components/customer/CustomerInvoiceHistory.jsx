import { useEffect, useState } from 'react'
import { CalendarCheck, ClipboardList, ReceiptText, X } from 'lucide-react'
import { getMyBookingInvoices, getMySalesInvoices, getMyServiceAppointments } from '../../lib/auth'
import { InvoiceModal, InvoiceSummaryCard } from '../common/InvoiceModal'

export function CustomerInvoiceHistory() {
  const [invoices, setInvoices] = useState([])
  const [bookingInvoices, setBookingInvoices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedBookingInvoice, setSelectedBookingInvoice] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadInvoices() {
      try {
        const [invoiceData, bookingInvoiceData, appointmentData] = await Promise.all([
          getMySalesInvoices(),
          getMyBookingInvoices(),
          getMyServiceAppointments(),
        ])
        if (isMounted) {
          setInvoices(invoiceData)
          setBookingInvoices(bookingInvoiceData)
          setAppointments(appointmentData.filter((appointment) => appointment.status === 'Completed'))
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

    loadInvoices()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Customer</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Purchase History</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <ReceiptText size={22} />
          </span>
        </div>

        {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(250px,280px))] gap-4">
          {isLoading ? (
            <p className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading invoices...</p>
          ) : invoices.length > 0 ? invoices.map((invoice) => (
            <InvoiceSummaryCard
              invoice={invoice}
              key={invoice.salesInvoiceId}
              onView={() => setSelectedInvoice(invoice)}
            />
          )) : (
            <p className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No purchase history yet.</p>
          )}
        </div>

        <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Service Center</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Service Invoices</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <ClipboardList size={22} />
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(250px,280px))] gap-4">
          {isLoading ? (
            <p className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading service invoices...</p>
          ) : bookingInvoices.length > 0 ? bookingInvoices.map((invoice) => (
            <BookingInvoiceCard
              invoice={invoice}
              key={invoice.bookingInvoiceId}
              onView={() => setSelectedBookingInvoice(invoice)}
            />
          )) : (
            <p className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No service invoices yet.</p>
          )}
        </div>

        <BookingInvoiceModal invoice={selectedBookingInvoice} onClose={() => setSelectedBookingInvoice(null)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Service Center</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Service History</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <CalendarCheck size={22} />
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading service history...</p>
          ) : appointments.length > 0 ? appointments.map((appointment) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={appointment.serviceAppointmentId}>
              <p className="text-xs font-black uppercase text-slate-500">{appointment.appointmentNumber}</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">{appointment.displayServiceType}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{appointment.vehicleLabel}</p>
              <div className="mt-4 grid gap-3">
                <HistoryRow label="Date" value={formatDate(appointment.completedAt ?? appointment.preferredDate)} />
                <HistoryRow label="Diagnosis" value={appointment.diagnosisNote || 'Not recorded'} />
                <HistoryRow label="Work done" value={appointment.completionNote || 'Completed'} />
              </div>
            </article>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No completed service history yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function BookingInvoiceCard({ invoice, onView }) {
  const hasBalance = Number(invoice.creditAmount || 0) > 0

  return (
    <article className="flex min-h-[220px] w-full max-w-[280px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-red-200 hover:shadow-md">
      <div className="h-1.5 bg-[var(--primary)]" />
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-red-600">Service invoice</p>
            <h3 className="mt-1 break-words text-lg font-black leading-tight text-slate-950">{invoice.invoiceNumber}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <ClipboardList size={18} />
          </span>
        </div>

        <div className="my-4 grid gap-2">
          <HistorySummaryLine label="Service" value={invoice.serviceType} />
          <HistorySummaryLine label="Vehicle" value={invoice.vehicleLabel} />
          <HistorySummaryLine label="Balance" value={formatMoney(invoice.creditAmount)} tone={hasBalance ? 'red' : 'green'} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">{invoice.paymentStatus}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatMoney(invoice.totalAmount)}</p>
          </div>
          <button
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={onView}
          >
            <ReceiptText size={17} />
            View
          </button>
        </div>
      </div>
    </article>
  )
}

function BookingInvoiceModal({ invoice, onClose }) {
  if (!invoice) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-3 py-5 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Service invoice</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{invoice.invoiceNumber}</h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            type="button"
            aria-label="Close service invoice"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-74px)] overflow-y-auto bg-slate-50 p-4">
          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="bg-black p-5 text-white">
              <p className="text-xs font-black uppercase text-red-200">Booking Invoice</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">{invoice.serviceType}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-300">{invoice.appointmentNumber}</p>
                </div>
                <p className="text-sm font-semibold text-slate-300">{formatDate(invoice.invoiceDate)}</p>
              </div>
            </header>

            <section className="grid gap-3 p-5 sm:grid-cols-3">
              <HistoryBox label="Vehicle" value={invoice.vehicleLabel} detail={invoice.customerName} />
              <HistoryBox label="Payment" value={invoice.paymentStatus} detail={`Via ${invoice.paymentMethod}`} />
              <HistoryBox label="Balance" value={formatMoney(invoice.creditAmount)} detail={invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : 'No due date'} tone="red" />
            </section>

            <section className="grid gap-5 px-5 pb-5 lg:grid-cols-[1fr_320px]">
              <div className="grid gap-3">
                <HistoryNote label="Work summary" value={invoice.workSummary} />
                <HistoryNote label="Diagnosis" value={invoice.diagnosisNote} />
                <HistoryNote label="Recommendation" value={invoice.recommendationNote} />
                <HistoryNote label="Notes" value={invoice.notes} />
              </div>

              <div className="grid content-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <InvoiceTotalRow label="Service charge" value={formatMoney(invoice.serviceCharge)} />
                <InvoiceTotalRow label="Discount" value={formatMoney(invoice.discountAmount)} />
                <InvoiceTotalRow label="Tax" value={formatMoney(invoice.taxAmount)} />
                <InvoiceTotalRow label="Customer credit used" value={formatMoney(invoice.customerCreditAppliedAmount)} />
                <InvoiceTotalRow label="Paid" value={formatMoney(invoice.paidAmount)} />
                <InvoiceTotalRow label="Total" value={formatMoney(invoice.totalAmount)} strong />
                <InvoiceTotalRow label="Balance" value={formatMoney(invoice.creditAmount)} danger />
                <InvoiceTotalRow label="Return / saved credit" value={formatMoney(invoice.customerCreditAddedAmount || invoice.returnAmount)} success={Number(invoice.customerCreditAddedAmount || invoice.returnAmount || 0) > 0} />
              </div>
            </section>
          </article>
        </div>
      </section>
    </div>
  )
}

function HistoryRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  )
}

function HistorySummaryLine({ label, tone = 'slate', value }) {
  const valueClass = tone === 'red'
    ? 'text-red-600'
    : tone === 'green'
      ? 'text-emerald-700'
      : 'text-slate-950'

  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className={`max-w-[150px] break-words text-right text-sm font-black ${valueClass}`}>{value || 'Not set'}</p>
    </div>
  )
}

function HistoryBox({ detail, label, tone = 'slate', value }) {
  const toneClass = tone === 'red' ? 'border-red-100 bg-red-50' : 'border-slate-200 bg-slate-50'
  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-base font-black text-slate-950">{value || 'Not set'}</p>
      <p className="mt-1 break-words text-xs font-semibold text-slate-500">{detail || 'Not recorded'}</p>
    </div>
  )
}

function HistoryNote({ label, value }) {
  if (!value) {
    return null
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function InvoiceTotalRow({ danger = false, label, strong = false, success = false, value }) {
  return (
    <div className={`flex justify-between gap-4 ${danger ? 'text-red-600' : success ? 'text-emerald-700' : strong ? 'text-slate-950' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
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

function formatMoney(value) {
  return new Intl.NumberFormat('en-NP', {
    currency: 'NPR',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value || 0))
}
