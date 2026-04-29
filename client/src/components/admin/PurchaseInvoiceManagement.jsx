import { useEffect, useMemo, useState } from 'react'
import { Edit3, Eye, FilePlus2, Plus, ReceiptText, RotateCcw, Search, Trash2, X } from 'lucide-react'
import {
  cancelPurchaseInvoice,
  createPurchaseInvoice,
  getParts,
  getPurchaseInvoices,
  getVendors,
  updatePurchaseInvoice,
} from '../../lib/auth'

const initialFormData = {
  invoiceNumber: '',
  vendorId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  paymentStatus: 'Unpaid',
  discountAmount: '',
  taxAmount: '',
  notes: '',
  items: [
    {
      partId: '',
      quantity: '1',
      unitCost: '',
    },
  ],
}

export function PurchaseInvoiceManagement() {
  const [invoices, setInvoices] = useState([])
  const [vendors, setVendors] = useState([])
  const [parts, setParts] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSidePanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadInvoiceData() {
      try {
        const [invoiceData, vendorData, partData] = await Promise.all([
          getPurchaseInvoices(),
          getVendors(),
          getParts(),
        ])
        if (isMounted) {
          setInvoices(invoiceData)
          setVendors(vendorData)
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

    loadInvoiceData()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return invoices
    }

    return invoices.filter((invoice) => [
      invoice.invoiceNumber,
      invoice.vendorName,
      invoice.paymentStatus,
      invoice.createdByUserName,
      invoice.createdByUserEmail,
      ...(invoice.items ?? []).flatMap((item) => [item.partName, item.partNumber, item.brand, item.category]),
    ].some((value) => value?.toLowerCase().includes(normalizedQuery)))
  }, [invoices, query])

  function openCreatePanel() {
    setMode('create')
    setSelectedInvoice(null)
    setFormData({
      ...initialFormData,
      invoiceNumber: `PI-${Date.now().toString().slice(-6)}`,
      purchaseDate: new Date().toISOString().slice(0, 10),
    })
    setError('')
    setMessage('')
  }

  function openEditPanel(invoice) {
    setMode('edit')
    setSelectedInvoice(invoice)
    setFormData({
      invoiceNumber: invoice.invoiceNumber ?? '',
      vendorId: invoice.vendorId ? String(invoice.vendorId) : '',
      purchaseDate: toDateInput(invoice.purchaseDate),
      paymentStatus: invoice.paymentStatus ?? 'Unpaid',
      discountAmount: String(invoice.discountAmount ?? ''),
      taxAmount: String(invoice.taxAmount ?? ''),
      notes: invoice.notes ?? '',
      items: (invoice.items?.length ? invoice.items : initialFormData.items).map((item) => ({
        partId: item.partId ? String(item.partId) : '',
        quantity: String(item.quantity ?? 1),
        unitCost: String(item.unitCost ?? ''),
      })),
    })
    setError('')
    setMessage('')
  }

  function openViewPanel(invoice) {
    setMode('view')
    setSelectedInvoice(invoice)
    setError('')
    setMessage('')
  }

  function closeSidePanel() {
    setMode('list')
    setSelectedInvoice(null)
    setFormData(initialFormData)
    setError('')
  }

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleItemChange(index, field, value) {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }))
  }

  function addItem() {
    setFormData((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          partId: '',
          quantity: '1',
          unitCost: '',
        },
      ],
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

  async function refreshParts() {
    const partData = await getParts()
    setParts(partData)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const payload = toInvoicePayload(formData)

      if (mode === 'edit' && selectedInvoice) {
        const updatedInvoice = await updatePurchaseInvoice(selectedInvoice.purchaseInvoiceId, payload)
        setInvoices((current) => current.map((invoice) => (
          invoice.purchaseInvoiceId === selectedInvoice.purchaseInvoiceId ? updatedInvoice : invoice
        )))
        setSelectedInvoice(updatedInvoice)
        setMessage('Purchase invoice updated and stock recalculated.')
        setMode('view')
      } else {
        const createdInvoice = await createPurchaseInvoice(payload)
        setInvoices((current) => [createdInvoice, ...current])
        setSelectedInvoice(createdInvoice)
        setMessage('Purchase invoice created and stock updated.')
        setMode('view')
      }

      await refreshParts()
      setFormData(initialFormData)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancel(invoice) {
    const shouldCancel = window.confirm(`Cancel purchase invoice ${invoice.invoiceNumber}? This will reverse stock quantities.`)
    if (!shouldCancel) {
      return
    }

    setError('')
    setMessage('')

    try {
      await cancelPurchaseInvoice(invoice.purchaseInvoiceId)
      setInvoices((current) => current.map((item) => (
        item.purchaseInvoiceId === invoice.purchaseInvoiceId
          ? { ...item, isCancelled: true }
          : item
      )))
      if (selectedInvoice?.purchaseInvoiceId === invoice.purchaseInvoiceId) {
        setSelectedInvoice((current) => current ? { ...current, isCancelled: true } : current)
      }
      await refreshParts()
      setMessage('Purchase invoice cancelled and stock reversed.')
    } catch (exception) {
      setError(exception.message)
    }
  }

  return (
    <div className={`grid gap-6 ${hasSidePanel ? 'xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.76fr)]' : ''}`}>
      <PurchaseInvoiceTable
        error={error}
        filteredInvoices={filteredInvoices}
        hasSidePanel={hasSidePanel}
        isLoading={isLoading}
        message={message}
        onAdd={openCreatePanel}
        onCancel={handleCancel}
        onEdit={openEditPanel}
        onQueryChange={setQuery}
        onView={openViewPanel}
        query={query}
        selectedInvoiceId={selectedInvoice?.purchaseInvoiceId}
      />

      {hasSidePanel && (
        mode === 'view' ? (
          <PurchaseInvoiceDetailsPanel
            invoice={selectedInvoice}
            onCancel={handleCancel}
            onClose={closeSidePanel}
            onEdit={openEditPanel}
          />
        ) : (
          <PurchaseInvoiceFormPanel
            formData={formData}
            isEditing={mode === 'edit'}
            isSubmitting={isSubmitting}
            onAddItem={addItem}
            onClose={closeSidePanel}
            onFieldChange={handleFieldChange}
            onItemChange={handleItemChange}
            onRemoveItem={removeItem}
            onSubmit={handleSubmit}
            parts={parts}
            vendors={vendors}
          />
        )
      )}
    </div>
  )
}

function PurchaseInvoiceTable({
  error,
  filteredInvoices,
  hasSidePanel,
  isLoading,
  message,
  onAdd,
  onCancel,
  onEdit,
  onQueryChange,
  onView,
  query,
  selectedInvoiceId,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Stock purchases</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Purchase Invoices</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search invoices"
              value={query}
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={onAdd}
          >
            <FilePlus2 size={18} />
            Add invoice
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className={`${hasSidePanel ? 'min-w-[740px]' : 'min-w-[1040px]'} w-full border-collapse text-left`}>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
              <th className="py-3 pr-4">Invoice</th>
              <th className="py-3 pr-4">Vendor</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Total</th>
              {!hasSidePanel && <th className="py-3 pr-4">Items</th>}
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasSidePanel ? 5 : 6}>
                  Loading purchase invoices...
                </td>
              </tr>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => {
                const isSelected = selectedInvoiceId === invoice.purchaseInvoiceId

                return (
                  <tr
                    className={`border-b border-slate-100 align-top last:border-0 ${isSelected ? 'bg-red-50/50' : ''}`}
                    key={invoice.purchaseInvoiceId}
                  >
                    <td className="py-4 pr-4">
                      <p className="text-sm font-black text-slate-950">{invoice.invoiceNumber}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(invoice.purchaseDate)}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-slate-700">{invoice.vendorName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatUserName(invoice.createdByUserName, invoice.createdByUserEmail)}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusPill invoice={invoice} />
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm font-black text-slate-800">{formatMoney(invoice.totalAmount)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Subtotal {formatMoney(invoice.subtotal)}</p>
                    </td>
                    {!hasSidePanel && (
                      <td className="py-4 pr-4">
                        <p className="text-sm font-semibold text-slate-700">{invoice.items?.length ?? 0} item(s)</p>
                        <p className="mt-1 max-w-48 truncate text-xs font-semibold text-slate-500">
                          {(invoice.items ?? []).map((item) => item.partName).join(', ') || 'No parts'}
                        </p>
                      </td>
                    )}
                    <td className="py-4">
                      <div className="flex gap-2">
                        <IconButton label={`View ${invoice.invoiceNumber}`} onClick={() => onView(invoice)}>
                          <Eye size={16} />
                        </IconButton>
                        {!invoice.isCancelled && (
                          <>
                            <IconButton label={`Edit ${invoice.invoiceNumber}`} onClick={() => onEdit(invoice)}>
                              <Edit3 size={16} />
                            </IconButton>
                            <IconButton danger label={`Cancel ${invoice.invoiceNumber}`} onClick={() => onCancel(invoice)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasSidePanel ? 5 : 6}>
                  No purchase invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PurchaseInvoiceFormPanel({
  formData,
  isEditing,
  isSubmitting,
  onAddItem,
  onClose,
  onFieldChange,
  onItemChange,
  onRemoveItem,
  onSubmit,
  parts,
  vendors,
}) {
  const totals = calculateFormTotals(formData.items, formData.discountAmount, formData.taxAmount)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader
        eyebrow="Purchase invoice"
        icon={ReceiptText}
        onClose={onClose}
        title={isEditing ? 'Edit Invoice' : 'Add Invoice'}
      />

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Invoice number" name="invoiceNumber" onChange={onFieldChange} required value={formData.invoiceNumber} />
          <TextField label="Purchase date" name="purchaseDate" onChange={onFieldChange} required type="date" value={formData.purchaseDate} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <SelectField label="Vendor" name="vendorId" onChange={onFieldChange} required value={formData.vendorId}>
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.vendorId} value={vendor.vendorId}>{vendor.name}</option>
            ))}
          </SelectField>
          <SelectField label="Payment status" name="paymentStatus" onChange={onFieldChange} value={formData.paymentStatus}>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </SelectField>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-900">Invoice items</p>
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={onAddItem}
            >
              <Plus size={15} />
              Add item
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {formData.items.map((item, index) => {
              const lineTotal = Number(item.quantity || 0) * Number(item.unitCost || 0)

              return (
                <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3" key={index}>
                  <SelectField
                    label="Part"
                    name={`part-${index}`}
                    onChange={(event) => onItemChange(index, 'partId', event.target.value)}
                    required
                    value={item.partId}
                  >
                    <option value="">Select part</option>
                    {parts.map((part) => (
                      <option key={part.partId} value={part.partId}>
                        {part.name} ({part.partNumber}) - stock {part.quantityInStock}
                      </option>
                    ))}
                  </SelectField>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <TextField
                      label="Quantity"
                      min="1"
                      name={`quantity-${index}`}
                      onChange={(event) => onItemChange(index, 'quantity', event.target.value)}
                      required
                      type="number"
                      value={item.quantity}
                    />
                    <TextField
                      label="Unit cost"
                      min="0"
                      name={`unit-cost-${index}`}
                      onChange={(event) => onItemChange(index, 'unitCost', event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={item.unitCost}
                    />
                    <button
                      className="mt-7 grid h-11 w-11 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={formData.items.length === 1}
                      type="button"
                      aria-label="Remove invoice item"
                      title="Remove invoice item"
                      onClick={() => onRemoveItem(index)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-xs font-black uppercase text-slate-500">Line total: {formatMoney(lineTotal)}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Discount amount" min="0" name="discountAmount" onChange={onFieldChange} step="0.01" type="number" value={formData.discountAmount} />
          <TextField label="Tax amount" min="0" name="taxAmount" onChange={onFieldChange} step="0.01" type="number" value={formData.taxAmount} />
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <div className="flex justify-between gap-4">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Total</span>
            <span className="text-slate-950">{formatMoney(totals.total)}</span>
          </div>
        </div>

        <TextareaField label="Notes" name="notes" onChange={onFieldChange} value={formData.notes} />

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <FilePlus2 size={18} />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update invoice' : 'Create invoice'}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function PurchaseInvoiceDetailsPanel({ invoice, onCancel, onClose, onEdit }) {
  if (!invoice) {
    return null
  }

  const rows = [
    { label: 'Invoice ID', value: invoice.purchaseInvoiceId },
    { label: 'Vendor', value: invoice.vendorName },
    { label: 'Purchase date', value: formatDate(invoice.purchaseDate) },
    { label: 'Payment status', value: invoice.paymentStatus },
    { label: 'Subtotal', value: formatMoney(invoice.subtotal) },
    { label: 'Discount', value: formatMoney(invoice.discountAmount) },
    { label: 'Tax', value: formatMoney(invoice.taxAmount) },
    { label: 'Total', value: formatMoney(invoice.totalAmount) },
    { label: 'Added by', value: formatUserName(invoice.createdByUserName, invoice.createdByUserEmail) },
    { label: 'Added role', value: formatRole(invoice.createdByUserRole) },
    { label: 'Added on', value: formatDate(invoice.createdAt) },
    { label: 'Updated by', value: formatUserName(invoice.updatedByUserName, invoice.updatedByUserEmail) },
    { label: 'Updated role', value: formatRole(invoice.updatedByUserRole) },
    { label: 'Updated on', value: formatDate(invoice.updatedAt) },
  ]

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader
        eyebrow={invoice.isCancelled ? 'Cancelled invoice' : 'Purchase invoice'}
        icon={invoice.isCancelled ? RotateCcw : ReceiptText}
        onClose={onClose}
        title={invoice.invoiceNumber}
      />

      <div className="mt-5">
        <StatusPill invoice={invoice} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" key={label}>
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || 'Not set'}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[560px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500">
              <th className="px-4 py-3">Part</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit cost</th>
              <th className="px-4 py-3">Line total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items ?? []).map((item) => (
              <tr className="border-b border-slate-100 last:border-0" key={item.purchaseInvoiceItemId}>
                <td className="px-4 py-3">
                  <p className="text-sm font-black text-slate-950">{item.partName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.partNumber}</p>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.quantity}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">{formatMoney(item.unitCost)}</td>
                <td className="px-4 py-3 text-sm font-black text-slate-900">{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailBlock label="Notes" value={invoice.notes || 'No notes added.'} />

      <div className="mt-5 flex flex-wrap gap-3">
        {!invoice.isCancelled && (
          <>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
              type="button"
              onClick={() => onEdit(invoice)}
            >
              <Edit3 size={18} />
              Edit invoice
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-50"
              type="button"
              onClick={() => onCancel(invoice)}
            >
              <Trash2 size={18} />
              Cancel invoice
            </button>
          </>
        )}
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={onClose}
        >
          <X size={18} />
          Close
        </button>
      </div>
    </section>
  )
}

function PanelHeader({ eyebrow, icon: Icon, onClose, title }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase text-red-600">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
      </div>
      <div className="flex gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
          <Icon size={22} />
        </span>
        <button
          className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
          type="button"
          aria-label="Close panel"
          title="Close panel"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

function IconButton({ children, danger = false, label, onClick }) {
  return (
    <button
      className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function TextField({ label, min, name, onChange, required = false, step, type = 'text', value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        min={min}
        name={name}
        onChange={onChange}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </label>
  )
}

function SelectField({ children, label, name, onChange, required = false, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        onChange={onChange}
        required={required}
        value={value}
      >
        {children}
      </select>
    </label>
  )
}

function TextareaField({ label, name, onChange, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        maxLength={500}
        name={name}
        onChange={onChange}
        value={value}
      />
    </label>
  )
}

function DetailBlock({ label, value }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-700">{value}</p>
    </div>
  )
}

function StatusPill({ invoice }) {
  const status = invoice.isCancelled ? 'Cancelled' : invoice.paymentStatus
  const className = invoice.isCancelled
    ? 'border-slate-300 bg-slate-100 text-slate-700'
    : invoice.paymentStatus === 'Paid'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : invoice.paymentStatus === 'Partial'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-red-200 bg-red-50 text-red-700'

  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black uppercase ${className}`}>
      {status}
    </span>
  )
}

function toInvoicePayload(data) {
  return {
    invoiceNumber: data.invoiceNumber.trim(),
    vendorId: Number.parseInt(data.vendorId, 10),
    purchaseDate: new Date(data.purchaseDate).toISOString(),
    paymentStatus: data.paymentStatus,
    discountAmount: Number(data.discountAmount || 0),
    taxAmount: Number(data.taxAmount || 0),
    notes: data.notes,
    items: data.items.map((item) => ({
      partId: Number.parseInt(item.partId, 10),
      quantity: Number.parseInt(item.quantity || '0', 10),
      unitCost: Number(item.unitCost || 0),
    })),
  }
}

function calculateFormTotals(items, discountAmount, taxAmount) {
  const subtotal = items.reduce((total, item) => (
    total + (Number(item.quantity || 0) * Number(item.unitCost || 0))
  ), 0)

  return {
    subtotal,
    total: subtotal - Number(discountAmount || 0) + Number(taxAmount || 0),
  }
}

function toDateInput(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10)
  }

  return new Date(value).toISOString().slice(0, 10)
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

function formatUserName(name, email) {
  return name || email || 'Not recorded'
}

function formatRole(role) {
  return role || 'No role'
}
