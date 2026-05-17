import { useEffect, useMemo, useState } from 'react'
import { Eye, FilePlus2, Mail, Plus, ReceiptText, Search, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  createSalesInvoice,
  createSalesInvoiceFromPartRequest,
  getBookingInvoices,
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
  customerCreditAppliedAmount: '',
  paymentMethod: 'Cash',
  dueDate: '',
  notes: '',
  items: [{ partId: '', partName: '', partNumber: '', quantity: '1', unitPrice: '' }],
}

const LOYALTY_THRESHOLD = 5000
const LOYALTY_DISCOUNT_RATE = 0.1

export function SalesInvoiceManagement() {
  const location = useLocation()
  const [invoices, setInvoices] = useState([])
  const [bookingInvoices, setBookingInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [parts, setParts] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [mode, setMode] = useState('list')
  const [invoiceType, setInvoiceType] = useState('parts')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const hasPanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [invoiceData, bookingInvoiceData, customerData, partData] = await Promise.all([
          getSalesInvoices(),
          getBookingInvoices(),
          searchVehicleCustomers(''),
          getParts(),
        ])

        if (isMounted) {
          setInvoices(invoiceData)
          setBookingInvoices(bookingInvoiceData)
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
    setMessage(`Creating invoice for request #${partRequest.partRequestId}.`)
    setMode('create')
    setSelectedInvoice(null)
    setIsCreateModalOpen(false)
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

  const filteredBookingInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return bookingInvoices
    }

    return bookingInvoices.filter((invoice) => [
      invoice.invoiceNumber,
      invoice.appointmentNumber,
      invoice.serviceType,
      invoice.customerName,
      invoice.customerEmail,
      invoice.vehicleLabel,
      invoice.paymentStatus,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery)))
  }, [bookingInvoices, query])

  const totals = useMemo(() => calculateTotals(formData.items, parts), [formData.items, parts])

  function openCreatePanel() {
    setMode('create')
    setSelectedInvoice(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
    setIsCreateModalOpen(false)
  }

  function openCreateModal() {
    setMode('create')
    setSelectedInvoice(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
    setIsCreateModalOpen(true)
  }

  function openCreateModalWithCurrentDraft() {
    setMode('create')
    setSelectedInvoice(null)
    setError('')
    setIsCreateModalOpen(true)
  }

  function openViewPanel(invoice) {
    setSelectedInvoice(invoice)
    setMode('list')
    setError('')
    setMessage('')
    setIsCreateModalOpen(false)
  }

  function closePanel() {
    setMode('list')
    setSelectedInvoice(null)
    setFormData(initialFormData)
    setError('')
    setIsCreateModalOpen(false)
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false)
  }

  function openDraftPreview() {
    setSelectedInvoice(buildDraftInvoicePreview(formData, customers, parts))
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
      setIsCreateModalOpen(false)
      setParts(await getParts())
      setCustomers(await searchVehicleCustomers(''))
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`grid items-start gap-6 ${hasPanel ? 'xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.78fr)]' : ''}`}>
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />
        <div className="relative">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-red-600">Invoices</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{invoiceType === 'parts' ? 'Part Sales Invoices' : 'Booking Invoices'}</h2>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {isLoading
                  ? 'Loading records...'
                  : `${invoiceType === 'parts' ? filteredInvoices.length : filteredBookingInvoices.length} record(s)`}
              </p>
            </div>
            {invoiceType === 'parts' && (
              <div className="flex flex-wrap items-center gap-2 lg:hidden">
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
                  type="button"
                  onClick={openCreatePanel}
                >
                  <FilePlus2 size={18} />
                  New invoice
                </button>
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={openCreateModal}
                >
                  <FilePlus2 size={18} />
                  Create in popup
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                className={`min-h-10 rounded-lg px-3 text-sm font-black transition ${invoiceType === 'parts' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                type="button"
                onClick={() => {
                  setInvoiceType('parts')
                  setMode('list')
                }}
              >
                Part sales invoice
              </button>
              <button
                className={`min-h-10 rounded-lg px-3 text-sm font-black transition ${invoiceType === 'bookings' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                type="button"
                onClick={() => {
                  setInvoiceType('bookings')
                  setMode('list')
                }}
              >
                Booking invoice
              </button>
            </div>
            <label className="relative block w-full min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                placeholder="Search invoices"
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
              />
            </label>
            <button
              className={`hidden min-h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] lg:inline-flex ${invoiceType !== 'parts' ? 'lg:hidden' : ''}`}
              type="button"
              onClick={openCreatePanel}
            >
              <FilePlus2 size={18} />
              New invoice
            </button>
            <button
              className={`hidden min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 lg:inline-flex ${invoiceType !== 'parts' ? 'lg:hidden' : ''}`}
              type="button"
              onClick={openCreateModal}
            >
              <FilePlus2 size={18} />
              Create in popup
            </button>
          </div>
        </div>

        {error && <Message tone="error">{error}</Message>}
        {message && <Message tone="success">{message}</Message>}

        {invoiceType === 'parts' ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white/90">
          <div className="overflow-x-auto">
          <table className={`${hasPanel ? 'min-w-[820px]' : 'min-w-[1080px]'} w-full text-left`}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase text-slate-500">
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
                <tr className="border-b border-slate-100 align-top transition hover:bg-red-50/40 last:border-0" key={invoice.salesInvoiceId}>
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
                    <PaymentSubline invoice={invoice} />
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
        </div>
        ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white/90">
          <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase text-slate-500">
                <th className="py-3 pr-4">Invoice</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Booking</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="py-5 text-sm font-semibold text-slate-600" colSpan={6}>Loading booking invoices...</td></tr>
              ) : filteredBookingInvoices.length > 0 ? filteredBookingInvoices.map((invoice) => (
                <tr className="border-b border-slate-100 align-top transition hover:bg-red-50/40 last:border-0" key={invoice.bookingInvoiceId}>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-black text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(invoice.invoiceDate)}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-bold text-slate-800">{invoice.customerName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{invoice.customerPhone || invoice.customerEmail}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-bold text-slate-800">{invoice.serviceType}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{invoice.vehicleLabel}</p>
                  </td>
                  <td className="py-4 pr-4"><StatusPill status={invoice.paymentStatus} /></td>
                  <td className="py-4 pr-4">
                    <p className="text-sm font-black text-slate-900">{formatMoney(invoice.totalAmount)}</p>
                    <PaymentSubline invoice={invoice} />
                  </td>
                  <td className="py-4">
                    <button
                      className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      type="button"
                      onClick={() => openViewPanel(toBookingInvoiceDocument(invoice))}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td className="py-5 text-sm font-semibold text-slate-600" colSpan={6}>No booking invoices found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        )}
      </section>

      {mode === 'create' && !isCreateModalOpen && (
        <InvoiceForm
          customers={customers}
          formData={formData}
          isSubmitting={isSubmitting}
          onAddItem={addItem}
          onClose={closePanel}
          onFieldChange={handleFieldChange}
          onItemChange={handleItemChange}
          onOpenCreateModal={openCreateModalWithCurrentDraft}
          onPreview={openDraftPreview}
          onRemoveItem={removeItem}
          onSubmit={handleSubmit}
          parts={parts}
          totals={totals}
        />
      )}

      <CreateInvoiceModal
        customers={customers}
        formData={formData}
        isOpen={isCreateModalOpen}
        isSubmitting={isSubmitting}
        onAddItem={addItem}
        onClose={closeCreateModal}
        onFieldChange={handleFieldChange}
        onItemChange={handleItemChange}
        onPreview={openDraftPreview}
        onRemoveItem={removeItem}
        onSubmit={handleSubmit}
        parts={parts}
        totals={totals}
      />

      <InvoiceModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  )
}

function InvoiceForm({
  customers,
  formData,
  isModal = false,
  isSubmitting,
  onAddItem,
  onClose,
  onFieldChange,
  onItemChange,
  onOpenCreateModal,
  onPreview,
  onRemoveItem,
  onSubmit,
  parts,
  totals,
}) {
  const selectedCustomer = customers.find((customer) => String(customer.customerId) === String(formData.customerId))
  const creditBalance = Number(selectedCustomer?.creditBalance || 0)
  const paymentSummary = calculatePaymentSummary(
    totals.total,
    formData.paidAmount,
    formData.customerCreditAppliedAmount,
  )
  const loyaltyGap = Math.max(0, LOYALTY_THRESHOLD - totals.subtotal)
  const hasLoyaltyDiscount = totals.discount > 0

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${isModal ? 'mx-auto w-full max-w-5xl' : 'xl:sticky xl:top-6'}`}>
      <PanelHeader
        onClose={onClose}
        onOpenCreateModal={!isModal ? onOpenCreateModal : undefined}
        title="Create Sales Invoice"
      />
      <form className={`mt-6 grid gap-4 ${isModal ? '' : 'xl:max-h-[calc(100vh-12.5rem)] xl:overflow-y-auto xl:pr-1'}`} onSubmit={onSubmit}>
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
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Customer</p>
          <SelectField label="Customer" name="customerId" onChange={onFieldChange} required value={formData.customerId}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.customerId} value={customer.customerId}>
                {customer.fullName || `Customer #${customer.customerId}`} ({customer.email}) - credit {formatMoney(customer.creditBalance || 0)}
              </option>
            ))}
          </SelectField>
          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">
            Available customer credit: {formatMoney(creditBalance)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Payment & Notes</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Payment method" name="paymentMethod" onChange={onFieldChange} value={formData.paymentMethod}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Online">Online</option>
              <option value="Credit">Credit</option>
            </SelectField>
            <TextField label="Paid amount" min="0" name="paidAmount" onChange={onFieldChange} step="0.01" type="number" value={formData.paidAmount} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Use customer credit"
              max={creditBalance}
              min="0"
              name="customerCreditAppliedAmount"
              onChange={onFieldChange}
              step="0.01"
              type="number"
              value={formData.customerCreditAppliedAmount}
            />
            <TextField label="Due date" name="dueDate" onChange={onFieldChange} type="date" value={formData.dueDate} />
          </div>
          <div className="mt-4">
            <TextareaField label="Notes" name="notes" onChange={onFieldChange} value={formData.notes} />
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          {hasLoyaltyDiscount ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
              Loyalty unlocked: 10% discount applied.
            </p>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-700">
              Spend {formatMoney(loyaltyGap)} more in this invoice to unlock 10% loyalty discount.
            </p>
          )}
          <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal)} />
          <SummaryRow label="Loyalty discount" value={formatMoney(totals.discount)} />
          <SummaryRow label="Total" value={formatMoney(totals.total)} strong />
          <SummaryRow label="Customer credit used" value={formatMoney(paymentSummary.creditApplied)} />
          <SummaryRow label="Due after payment" value={formatMoney(paymentSummary.due)} />
          <SummaryRow label="Return / saved credit" value={formatMoney(paymentSummary.returnAmount)} />
        </div>

        <div className={`grid gap-3 ${!isModal ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {!isModal && (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={onOpenCreateModal}
            >
              <FilePlus2 size={18} />
              Full create popup
            </button>
          )}
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={onPreview}
          >
            <Eye size={18} />
            Open invoice popup
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <Mail size={18} />
            {isSubmitting ? 'Creating...' : 'Create & email invoice'}
          </button>
        </div>
      </form>
    </section>
  )
}

function PanelHeader({ onClose, onOpenCreateModal, title }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-red-600">Invoice</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
      </div>
      <div className="flex gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]"><ReceiptText size={20} /></span>
        {typeof onOpenCreateModal === 'function' && (
          <button className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50" type="button" onClick={onOpenCreateModal}>
            Popup
          </button>
        )}
        <button className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>
    </div>
  )
}

function CreateInvoiceModal({
  customers,
  formData,
  isOpen,
  isSubmitting,
  onAddItem,
  onClose,
  onFieldChange,
  onItemChange,
  onPreview,
  onRemoveItem,
  onSubmit,
  parts,
  totals,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="mx-auto w-full max-w-[1220px]">
        <InvoiceForm
          customers={customers}
          formData={formData}
          isModal
          isSubmitting={isSubmitting}
          onAddItem={onAddItem}
          onClose={onClose}
          onFieldChange={onFieldChange}
          onItemChange={onItemChange}
          onPreview={onPreview}
          onRemoveItem={onRemoveItem}
          onSubmit={onSubmit}
          parts={parts}
          totals={totals}
        />
      </div>
    </div>
  )
}

function SelectField({ children, label, name, onChange, required = false, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100" name={name} required={required} value={value} onChange={onChange}>{children}</select>
    </label>
  )
}

function TextField({ label, name, onChange, value, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100" name={name} onChange={onChange} value={value} {...props} />
    </label>
  )
}

function TextareaField({ label, name, onChange, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100" maxLength={500} name={name} onChange={onChange} value={value} />
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
      <span className="font-semibold">{label}</span>
      <span className="font-black text-slate-900">{value}</span>
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
    customerCreditAppliedAmount: Number(data.customerCreditAppliedAmount || 0),
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

function buildDraftInvoicePreview(formData, customers, parts) {
  const selectedCustomer = customers.find((customer) => String(customer.customerId) === String(formData.customerId))
  const subtotalData = calculateTotals(formData.items, parts)
  const paymentSummary = calculatePaymentSummary(
    subtotalData.total,
    formData.paidAmount,
    formData.customerCreditAppliedAmount,
  )
  const paidAmount = Number(formData.paidAmount || 0)
  const creditApplied = Number(paymentSummary.creditApplied || 0)

  let paymentStatus = 'Credit'
  if (paymentSummary.due <= 0) {
    paymentStatus = 'Paid'
  } else if (paidAmount > 0 || creditApplied > 0) {
    paymentStatus = 'PartiallyPaid'
  }

  const items = formData.items.map((item, index) => {
    const matchedPart = parts.find((current) => String(current.partId) === String(item.partId))
    const quantity = Number.parseInt(item.quantity || '0', 10)
    const unitPrice = Number(item.unitPrice || matchedPart?.sellingPrice || 0)

    return {
      salesInvoiceItemId: `draft-${index + 1}`,
      partId: item.partId ? Number.parseInt(item.partId, 10) : null,
      partName: item.partName || matchedPart?.name || 'Custom item',
      partNumber: item.partNumber || matchedPart?.partNumber || '',
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    }
  })

  return {
    invoiceType: 'sales',
    salesInvoiceId: 0,
    invoiceNumber: 'DRAFT PREVIEW',
    customerId: selectedCustomer?.customerId ?? 0,
    customerName: selectedCustomer?.fullName || 'Selected customer',
    customerEmail: selectedCustomer?.email || 'Not selected',
    customerPhone: selectedCustomer?.phone || '',
    staffId: 0,
    staffName: 'Current staff',
    staffEmail: '',
    sourcePartRequestId: formData.sourcePartRequestId,
    invoiceDate: new Date().toISOString(),
    subtotal: subtotalData.subtotal,
    discountAmount: subtotalData.discount,
    discountReason: subtotalData.discount > 0 ? 'Loyalty discount: 10% for purchases above 5000' : '',
    taxAmount: 0,
    totalAmount: subtotalData.total,
    paidAmount,
    customerCreditAppliedAmount: creditApplied,
    creditAmount: paymentSummary.due,
    returnAmount: paymentSummary.returnAmount,
    customerCreditAddedAmount: paymentSummary.returnAmount,
    paymentStatus,
    paymentMethod: formData.paymentMethod,
    dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
    notes: formData.notes || '',
    emailSent: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    items,
  }
}

function calculatePaymentSummary(total, paidAmount, customerCreditAppliedAmount) {
  const creditApplied = Math.min(Number(customerCreditAppliedAmount || 0), Number(total || 0))
  const payable = Math.max(Number(total || 0) - creditApplied, 0)
  const paid = Number(paidAmount || 0)

  return {
    creditApplied,
    due: Math.max(payable - paid, 0),
    returnAmount: Math.max(paid - payable, 0),
  }
}

function calculateTotals(items, parts) {
  const subtotal = items.reduce((total, item) => {
    const part = parts.find((current) => String(current.partId) === String(item.partId))
    const unitPrice = Number(item.unitPrice || part?.sellingPrice || 0)
    return total + Number(item.quantity || 0) * unitPrice
  }, 0)
  const discount = subtotal > LOYALTY_THRESHOLD ? subtotal * LOYALTY_DISCOUNT_RATE : 0

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

function PaymentSubline({ invoice }) {
  if (Number(invoice.returnAmount || 0) > 0) {
    return <p className="mt-1 text-xs font-semibold text-emerald-700">Return {formatMoney(invoice.returnAmount)}</p>
  }

  if (Number(invoice.customerCreditAddedAmount || 0) > 0) {
    return <p className="mt-1 text-xs font-semibold text-emerald-700">Saved credit {formatMoney(invoice.customerCreditAddedAmount)}</p>
  }

  return <p className="mt-1 text-xs font-semibold text-slate-500">Due {formatMoney(invoice.creditAmount)}</p>
}

function toBookingInvoiceDocument(invoice) {
  return {
    ...invoice,
    invoiceType: 'booking',
    subtotal: invoice.serviceCharge,
    discountReason: '',
    items: [{
      salesInvoiceItemId: `booking-${invoice.bookingInvoiceId}`,
      partName: invoice.serviceType,
      partNumber: invoice.appointmentNumber || invoice.vehicleLabel,
      quantity: 1,
      unitPrice: invoice.serviceCharge,
      lineTotal: invoice.serviceCharge,
    }],
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
