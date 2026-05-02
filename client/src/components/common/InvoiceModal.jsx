import { Eye, ReceiptText, X } from 'lucide-react'
import { InvoiceDocument } from './InvoiceDocument'

export function InvoiceSummaryCard({ invoice, onView }) {
  const hasBalance = Number(invoice.creditAmount || 0) > 0

  return (
    <article className="flex min-h-[220px] w-full max-w-[280px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-red-200 hover:shadow-md">
      <div className="h-1.5 bg-[var(--primary)]" />
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-red-600">Sales invoice</p>
            <h3 className="mt-1 break-words text-lg font-black leading-tight text-slate-950">{invoice.invoiceNumber}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <ReceiptText size={18} />
          </span>
        </div>

        <div className="my-4 grid gap-2">
          <SummaryLine label="Customer" value={invoice.customerName} />
          <SummaryLine label="Total" value={formatMoney(invoice.totalAmount)} />
          <SummaryLine label="Balance" value={formatMoney(invoice.creditAmount)} tone={hasBalance ? 'red' : 'green'} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">{invoice.paymentStatus}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{invoice.items?.length ?? 0} item(s)</p>
          </div>
          <button
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={onView}
          >
            <Eye size={17} />
            View invoice
          </button>
        </div>
      </div>
    </article>
  )
}

export function InvoiceModal({ invoice, onClose }) {
  if (!invoice) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-3 py-5 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Invoice preview</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{invoice.invoiceNumber}</h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
            type="button"
            aria-label="Close invoice preview"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-74px)] overflow-y-auto bg-slate-50 p-4">
          <InvoiceDocument invoice={invoice} />
        </div>
      </section>
    </div>
  )
}

function SummaryLine({ label, tone = 'slate', value }) {
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

function formatDate(value) {
  if (!value) {
    return 'Not set'
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
