import { useEffect, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { getMySalesInvoices } from '../../lib/auth'
import { InvoiceModal, InvoiceSummaryCard } from '../common/InvoiceModal'

export function CustomerInvoiceHistory() {
  const [invoices, setInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadInvoices() {
      try {
        const data = await getMySalesInvoices()
        if (isMounted) {
          setInvoices(data)
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
  )
}
