import { useEffect, useMemo, useState } from 'react'
import { FilePlus2, Mail, Plus, ReceiptText, Search, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  createSalesInvoice,
  createSalesInvoiceFromPartRequest,
  getParts,
  getSalesInvoices,
  searchVehicleCustomers,
} from '../../lib/auth'
import { InvoiceModal } from '../common/InvoiceModal'

const initialFormData = {
  customerId: '',
  sourcePartRequestId: null,
  sourcePartRequest: null,
  paidAmount: '',
  paymentMethod: 'Cash',
  dueDate: '',
  notes: '',
  items: [{ partId: '', partName: '', partNumber: '', quantity: '1', unitPrice: '' }],
}

export function SalesInvoiceManagement() {
  const location = useLocation()
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [parts, setParts] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasPanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [invoiceData, customerData, partData] = await Promise.all([
          getSalesInvoices(),
          searchVehicleCustomers(''),
          getParts(),
        ])

        if (isMounted) {
          setInvoices(invoiceData)
          setCustomers(customerData)
          setParts(partData)
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

  useEffect(() => {
    const partRequest = location.state?.partRequest
    if (!partRequest) {
      return
    }

    setFormData({
      ...initialFormData,
      customerId: String(partRequest.customerId),
      sourcePartRequestId: partRequest.partRequestId,
      sourcePartRequest: partRequest,
      notes: `Created from part request #${partRequest.partRequestId}.`,
      items: [{
        partId: partRequest.requestedPartId ? String(partRequest.requestedPartId) : '',
        partName: partRequest.partName ?? '',
        partNumber: partRequest.partNumber ?? '',
        quantity: String(partRequest.quantity || 1),
        unitPrice: '',
      }],
    })
    setMode('create')
    setSelectedInvoice(null)
    setMessage(`Creating invoice for request #${partRequest.partRequestId}.`)
  }, [location.state])

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return invoices
    }

    return invoices.filter((invoice) => [
      invoice.invoiceNumber,
      invoice.customerName,
      invoice.customerEmail,
      invoice.paymentStatus,
      ...(invoice.items ?? []).flatMap((item) => [item.partName, item.partNumber]),
    ].some((value) => value?.toLowerCase().includes(normalizedQuery)))
  }, [invoices, query])

  const totals = useMemo(() => calculateTotals(formData.items, parts), [formData.items, parts])

  function openCreatePanel() {
    setMode('create')
    setSelectedInvoice(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
  }

  function openViewPanel(invoice) {
    setSelectedInvoice(invoice)
    setMode('list')
    setError('')
    setMessage('')
  }

  function closePanel() {
    setMode('list')
    setSelectedInvoice(null)
    setFormData(initialFormData)
    setError('')
  }

  async function handleSearch(value) {
    setQuery(value)
    try {
      setInvoices(await getSalesInvoices(value))
    } catch (exception) {
      setError(exception.message)
    }
  }

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function handleItemChange(index, field, value) {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? updateInvoiceItem(item, field, value, parts) : item
      )),
    }))
  }

  function addItem() {
    setFormData((current) => ({
      ...current,
      items: [...current.items, { partId: '', partName: '', partNumber: '', quantity: '1', unitPrice: '' }],
    }))
  }

  function removeItem(index) {
    setFormData((current) => ({
      ...current,
      items: current.items.length === 1
        ? current.items
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const payload = toPayload(formData)
      const createdInvoice = formData.sourcePartRequestId
        ? await createSalesInvoiceFromPartRequest(formData.sourcePartRequestId, payload)
        : await createSalesInvoice(payload)

      setInvoices((current) => [createdInvoice, ...current])
      setSelectedInvoice(createdInvoice)
      setMode('list')
      setMessage(createdInvoice.emailSent
        ? 'Sales invoice created and emailed to the customer.'
        : 'Sales invoice created, but email was not sent. Check Brevo settings.')
      setFormData(initialFormData)
      setParts(await getParts())
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`grid gap-6 ${hasPanel ? 'xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]' : ''}`}>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Sales</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Sales Invoices</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                placeholder="Search invoices"
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
              />
            </label>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
              type="button"
              onClick={openCreatePanel}
            >
              <FilePlus2 size={18} />
              New invoice
            </button>
          </div>
        </div>

        {error && <Message tone="error">{error}</Message>}
        {message && <Message tone="success">{message}</Message>}

        <div className="mt-6 overflow-x-auto">
          <table className={`${hasPanel ? 'min-w-[760px]' : 'min-w-[1040px]'} w-full text-left`}>
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                <th className="py-3 pr-4">Invoice</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Total</th>
                {!hasPanel && <th className="py-3 pr-4">Items</th>}
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasPanel ? 5 : 6}>Loading invoices...</td></tr>
              ) : filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                <tr className="border-b border-slate-100 align-top last:border-0" key={invoice.salesInvoiceId}>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-black text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(invoice.invoiceDate)}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-bold text-slate-800">{invoice.customerName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{invoice.customerEmail}</p>
                  </td>
                  <td className="py-4 pr-4"><StatusPill status={invoice.paymentStatus} /></td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-black text-slate-900">{formatMoney(invoice.totalAmount)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Due {formatMoney(invoice.creditAmount)}</p>
                  </td>
                  {!hasPanel && (
                    <td className="py-4 pr-4 text-sm font-semibold text-slate-700">{invoice.items?.length ?? 0} item(s)</td>
                  )}
                  <td className="py-4">
                    <button
                      className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      type="button"
                      onClick={() => openViewPanel(invoice)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasPanel ? 5 : 6}>No sales invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mode === 'create' && (
        <InvoiceForm
          customers={customers}
          formData={formData}
          isSubmitting={isSubmitting}
          onAddItem={addItem}
          onClose={closePanel}
          onFieldChange={handleFieldChange}
          onItemChange={handleItemChange}
          onRemoveItem={removeItem}
          onSubmit={handleSubmit}
          parts={parts}
          totals={totals}
        />
      )}

      <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  )
}

function InvoiceForm({
  customers,
  formData,
  isSubmitting,
  onAddItem,
  onClose,
  onFieldChange,
  onItemChange,
  onRemoveItem,
  onSubmit,
  parts,
  totals,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader onClose={onClose} title="Create Sales Invoice" />
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        {formData.sourcePartRequestId && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            <p>Completing part request #{formData.sourcePartRequestId}</p>
            {formData.sourcePartRequest && (
              <p className="mt-1 text-xs font-semibold">
                Requested: {formData.sourcePartRequest.partName}
                {formData.sourcePartRequest.partNumber ? ` (${formData.sourcePartRequest.partNumber})` : ''}
                {' '}x{formData.sourcePartRequest.quantity}
              </p>
            )}
            {formData.sourcePartRequest && !formData.sourcePartRequest.requestedPartId && (
              <p className="mt-2 rounded-md bg-white/70 px-3 py-2 text-xs font-bold text-amber-800">
                This was a custom request. You can write the invoice item manually, or select a matching inventory part if stock should be reduced.
              </p>
            )}
          </div>
        )}
        <SelectField label="Customer" name="customerId" onChange={onFieldChange} required value={formData.customerId}>
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.customerId} value={customer.customerId}>
              {customer.fullName || `Customer #${customer.customerId}`} ({customer.email})
            </option>
          ))}
        </SelectField>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-900">Invoice items</p>
            <button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50" type="button" onClick={onAddItem}>
              <Plus size={15} />
              Add item
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {formData.items.map((item, index) => {
              const part = parts.find((current) => String(current.partId) === String(item.partId))
              const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || part?.sellingPrice || 0)
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-3" key={index}>
                  <SelectField label="Matching inventory part (optional)" name={`part-${index}`} onChange={(event) => onItemChange(index, 'partId', event.target.value)} value={item.partId}>
                    <option value="">No inventory match</option>
                    {parts.map((partOption) => (
                      <option key={partOption.partId} value={partOption.partId}>
                        {partOption.name} ({partOption.partNumber}) - Rs. {formatRawMoney(partOption.sellingPrice)} - stock {partOption.quantityInStock}
                      </option>
                    ))}
                  </SelectField>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextField label="Invoice item name" name={`name-${index}`} onChange={(event) => onItemChange(index, 'partName', event.target.value)} required value={item.partName} />
                    <TextField label="Part number" name={`number-${index}`} onChange={(event) => onItemChange(index, 'partNumber', event.target.value)} value={item.partNumber} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <TextField label="Quantity" min="1" name={`quantity-${index}`} onChange={(event) => onItemChange(index, 'quantity', event.target.value)} required type="number" value={item.quantity} />
                    <TextField label="Unit price" min="0.01" name={`price-${index}`} onChange={(event) => onItemChange(index, 'unitPrice', event.target.value)} required step="0.01" type="number" value={item.unitPrice} />
                    <button
                      className="mt-7 grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                      disabled={formData.items.length === 1}
                      type="button"
                      aria-label="Remove item"
                      onClick={() => onRemoveItem(index)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-black uppercase text-slate-500">Line total: {formatMoney(lineTotal)}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Payment method" name="paymentMethod" onChange={onFieldChange} value={formData.paymentMethod}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Online">Online</option>
            <option value="Credit">Credit</option>
          </SelectField>
          <TextField label="Paid amount" min="0" name="paidAmount" onChange={onFieldChange} step="0.01" type="number" value={formData.paidAmount} />
        </div>
        <TextField label="Due date" name="dueDate" onChange={onFieldChange} type="date" value={formData.dueDate} />
        <TextareaField label="Notes" name="notes" onChange={onFieldChange} value={formData.notes} />

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal)} />
          <SummaryRow label="Loyalty discount" value={formatMoney(totals.discount)} />
          <SummaryRow label="Total" value={formatMoney(totals.total)} strong />
          <SummaryRow label="Credit after paid amount" value={formatMoney(Math.max(totals.total - Number(formData.paidAmount || 0), 0))} />
        </div>

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <Mail size={18} />
          {isSubmitting ? 'Creating...' : 'Create & email invoice'}
        </button>
      </form>
    </section>
  )
}

function PanelHeader({ onClose, title }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase text-red-600">Invoice</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
      </div>
      <div className="flex gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]"><ReceiptText size={22} /></span>
        <button className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>
    </div>
  )
}

function SelectField({ children, label, name, onChange, required = false, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100" name={name} required={required} value={value} onChange={onChange}>{children}</select>
    </label>
  )
}

function TextField({ label, name, onChange, value, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100" name={name} onChange={onChange} value={value} {...props} />
    </label>
  )
}

function TextareaField({ label, name, onChange, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100" maxLength={500} name={name} onChange={onChange} value={value} />
    </label>
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

function SummaryRow({ label, strong = false, value }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'text-slate-950' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function StatusPill({ status }) {
  const className = status === 'Paid'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'PartiallyPaid'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black uppercase ${className}`}>{status}</span>
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'mt-5 border-red-200 bg-red-50 text-red-700'
    : 'mt-5 border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function toPayload(data) {
  return {
    customerId: Number.parseInt(data.customerId, 10),
    paidAmount: Number(data.paidAmount || 0),
    paymentMethod: data.paymentMethod,
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    notes: data.notes,
    items: data.items.map((item) => ({
      partId: item.partId ? Number.parseInt(item.partId, 10) : null,
      partName: item.partName,
      partNumber: item.partNumber,
      unitPrice: Number(item.unitPrice || 0),
      quantity: Number.parseInt(item.quantity || '0', 10),
    })),
  }
}

function calculateTotals(items, parts) {
  const subtotal = items.reduce((total, item) => {
    const part = parts.find((current) => String(current.partId) === String(item.partId))
    const unitPrice = Number(item.unitPrice || part?.sellingPrice || 0)
    return total + Number(item.quantity || 0) * unitPrice
  }, 0)
  const discount = subtotal > 5000 ? subtotal * 0.1 : 0

  return {
    subtotal,
    discount,
    total: subtotal - discount,
  }
}

function updateInvoiceItem(item, field, value, parts) {
  if (field !== 'partId') {
    return { ...item, [field]: value }
  }

  const part = parts.find((current) => String(current.partId) === String(value))
  if (!part) {
    return { ...item, partId: value }
  }

  return {
    ...item,
    partId: value,
    partName: item.partName || part.name,
    partNumber: item.partNumber || part.partNumber,
    unitPrice: item.unitPrice || String(part.sellingPrice ?? ''),
  }
}

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-NP', { currency: 'NPR', maximumFractionDigits: 2, style: 'currency' }).format(Number(value || 0))
}

function formatRawMoney(value) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value || 0))
}
