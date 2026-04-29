import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Edit3, Eye, Package, Plus, Search, Trash2, Wrench, X } from 'lucide-react'
import { createPart, deletePart, getParts, getVendors, updatePart } from '../../lib/auth'

const initialFormData = {
  name: '',
  partNumber: '',
  brand: '',
  category: '',
  unitCost: '',
  sellingPrice: '',
  quantityInStock: '',
  reorderLevel: '10',
  vendorId: '',
  description: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  compatibleEngine: '',
  shelfLocation: '',
  warrantyPeriod: '',
  notes: '',
}

export function PartManagement() {
  const [parts, setParts] = useState([])
  const [vendors, setVendors] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [selectedPart, setSelectedPart] = useState(null)
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSidePanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadInventory() {
      try {
        const [partData, vendorData] = await Promise.all([getParts(), getVendors()])
        if (isMounted) {
          setParts(partData)
          setVendors(vendorData)
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

    loadInventory()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredParts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return parts
    }

    return parts.filter((part) => {
      const details = part.details ?? {}
      return [
        part.name,
        part.partNumber,
        part.brand,
        part.category,
        part.vendorName,
        details.vehicleMake,
        details.vehicleModel,
        details.vehicleYear,
        details.shelfLocation,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery))
    })
  }, [parts, query])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function openCreatePanel() {
    setMode('create')
    setSelectedPart(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
  }

  function openEditPanel(part) {
    const details = part.details ?? {}

    setMode('edit')
    setSelectedPart(part)
    setFormData({
      name: part.name ?? '',
      partNumber: part.partNumber ?? '',
      brand: part.brand ?? '',
      category: part.category ?? '',
      unitCost: String(part.unitCost ?? ''),
      sellingPrice: String(part.sellingPrice ?? ''),
      quantityInStock: String(part.quantityInStock ?? ''),
      reorderLevel: String(part.reorderLevel ?? 10),
      vendorId: part.vendorId ? String(part.vendorId) : '',
      description: details.description ?? '',
      vehicleMake: details.vehicleMake ?? '',
      vehicleModel: details.vehicleModel ?? '',
      vehicleYear: details.vehicleYear ?? '',
      compatibleEngine: details.compatibleEngine ?? '',
      shelfLocation: details.shelfLocation ?? '',
      warrantyPeriod: details.warrantyPeriod ?? '',
      notes: details.notes ?? '',
    })
    setError('')
    setMessage('')
  }

  function openViewPanel(part) {
    setMode('view')
    setSelectedPart(part)
    setError('')
    setMessage('')
  }

  function closeSidePanel() {
    setMode('list')
    setSelectedPart(null)
    setFormData(initialFormData)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const payload = toPartPayload(formData)

      if (mode === 'edit' && selectedPart) {
        const updatedPart = await updatePart(selectedPart.partId, payload)
        setParts((current) => current.map((part) => (
          part.partId === selectedPart.partId ? updatedPart : part
        )))
        setSelectedPart(updatedPart)
        setMessage('Part details updated.')
        setMode('view')
      } else {
        const createdPart = await createPart(payload)
        setParts((current) => [createdPart, ...current])
        setSelectedPart(createdPart)
        setMessage('Part added successfully.')
        setMode('view')
      }

      setFormData(initialFormData)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(part) {
    const shouldDelete = window.confirm(`Delete ${part.name} from active inventory?`)
    if (!shouldDelete) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deletePart(part.partId)
      setParts((current) => current.filter((item) => item.partId !== part.partId))
      setMessage('Part removed from active inventory.')
      if (selectedPart?.partId === part.partId) {
        closeSidePanel()
      }
    } catch (exception) {
      setError(exception.message)
    }
  }

  return (
    <div className={`grid gap-6 ${hasSidePanel ? 'xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.72fr)]' : ''}`}>
      <PartTable
        error={error}
        filteredParts={filteredParts}
        hasSidePanel={hasSidePanel}
        isLoading={isLoading}
        message={message}
        onAdd={openCreatePanel}
        onDelete={handleDelete}
        onEdit={openEditPanel}
        onQueryChange={setQuery}
        onView={openViewPanel}
        query={query}
        selectedPartId={selectedPart?.partId}
      />

      {hasSidePanel && (
        mode === 'view' ? (
          <PartDetailsPanel
            onClose={closeSidePanel}
            onEdit={openEditPanel}
            part={selectedPart}
          />
        ) : (
          <PartFormPanel
            formData={formData}
            isEditing={mode === 'edit'}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            onClose={closeSidePanel}
            onSubmit={handleSubmit}
            vendors={vendors}
          />
        )
      )}
    </div>
  )
}

function PartTable({
  error,
  filteredParts,
  hasSidePanel,
  isLoading,
  message,
  onAdd,
  onDelete,
  onEdit,
  onQueryChange,
  onView,
  query,
  selectedPartId,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Active inventory</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Parts Management</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search parts"
              value={query}
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={onAdd}
          >
            <Plus size={18} />
            Add part
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
        <table className={`${hasSidePanel ? 'min-w-[720px]' : 'min-w-[1080px]'} w-full border-collapse text-left`}>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
              <th className="py-3 pr-4">Part</th>
              <th className="py-3 pr-4">Stock</th>
              <th className="py-3 pr-4">Pricing</th>
              {!hasSidePanel && (
                <>
                  <th className="py-3 pr-4">Vendor</th>
                  <th className="py-3 pr-4">Compatibility</th>
                </>
              )}
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasSidePanel ? 4 : 6}>
                  Loading parts...
                </td>
              </tr>
            ) : filteredParts.length > 0 ? (
              filteredParts.map((part) => {
                const details = part.details ?? {}
                const isSelected = selectedPartId === part.partId

                return (
                  <tr
                    className={`border-b border-slate-100 align-top last:border-0 ${isSelected ? 'bg-red-50/50' : ''}`}
                    key={part.partId}
                  >
                    <td className="py-4 pr-4">
                      <p className="text-sm font-black text-slate-950">{part.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{part.partNumber}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{part.brand} / {part.category}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-800">{part.quantityInStock}</p>
                        {part.isLowStock && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                            <AlertTriangle size={13} />
                            Low
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Reorder at {part.reorderLevel}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-slate-700">{formatMoney(part.sellingPrice)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Cost {formatMoney(part.unitCost)}</p>
                    </td>
                    {!hasSidePanel && (
                      <>
                        <td className="py-4 pr-4">
                          <p className="text-sm font-semibold text-slate-700">{part.vendorName || 'No vendor'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{details.shelfLocation || 'No shelf location'}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="text-sm font-semibold text-slate-700">{formatVehicle(details)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{details.compatibleEngine || 'Any engine'}</p>
                        </td>
                      </>
                    )}
                    <td className="py-4">
                      <div className="flex gap-2">
                        <IconButton label={`View ${part.name}`} onClick={() => onView(part)}>
                          <Eye size={16} />
                        </IconButton>
                        <IconButton label={`Edit ${part.name}`} onClick={() => onEdit(part)}>
                          <Edit3 size={16} />
                        </IconButton>
                        <IconButton danger label={`Delete ${part.name}`} onClick={() => onDelete(part)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasSidePanel ? 4 : 6}>
                  No parts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PartFormPanel({ formData, isEditing, isSubmitting, onChange, onClose, onSubmit, vendors }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader
        eyebrow="Inventory"
        icon={Wrench}
        onClose={onClose}
        title={isEditing ? 'Edit Part' : 'Add Part'}
      />

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Part name" name="name" onChange={onChange} required value={formData.name} />
          <TextField label="Part number" name="partNumber" onChange={onChange} required value={formData.partNumber} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Brand" name="brand" onChange={onChange} required value={formData.brand} />
          <TextField label="Category" name="category" onChange={onChange} required value={formData.category} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Unit cost" min="0" name="unitCost" onChange={onChange} required step="0.01" type="number" value={formData.unitCost} />
          <TextField label="Selling price" min="0" name="sellingPrice" onChange={onChange} required step="0.01" type="number" value={formData.sellingPrice} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Quantity in stock" min="0" name="quantityInStock" onChange={onChange} required type="number" value={formData.quantityInStock} />
          <TextField label="Reorder level" min="0" name="reorderLevel" onChange={onChange} required type="number" value={formData.reorderLevel} />
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Vendor
          <select
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
            name="vendorId"
            onChange={onChange}
            value={formData.vendorId}
          >
            <option value="">No vendor selected</option>
            {vendors.map((vendor) => (
              <option key={vendor.vendorId} value={vendor.vendorId}>
                {vendor.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Vehicle make" name="vehicleMake" onChange={onChange} value={formData.vehicleMake} />
          <TextField label="Vehicle model" name="vehicleModel" onChange={onChange} value={formData.vehicleModel} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Vehicle year" name="vehicleYear" onChange={onChange} value={formData.vehicleYear} />
          <TextField label="Compatible engine" name="compatibleEngine" onChange={onChange} value={formData.compatibleEngine} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Shelf location" name="shelfLocation" onChange={onChange} value={formData.shelfLocation} />
          <TextField label="Warranty period" name="warrantyPeriod" onChange={onChange} value={formData.warrantyPeriod} />
        </div>

        <TextareaField label="Description" name="description" onChange={onChange} value={formData.description} />
        <TextareaField label="Notes" name="notes" onChange={onChange} value={formData.notes} />

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <Plus size={18} />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update part' : 'Add part'}
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

function PartDetailsPanel({ onClose, onEdit, part }) {
  if (!part) {
    return null
  }

  const details = part.details ?? {}
  const rows = [
    { label: 'Part ID', value: part.partId },
    { label: 'Part number', value: part.partNumber },
    { label: 'Brand', value: part.brand },
    { label: 'Category', value: part.category },
    { label: 'Unit cost', value: formatMoney(part.unitCost) },
    { label: 'Selling price', value: formatMoney(part.sellingPrice) },
    { label: 'Quantity', value: part.quantityInStock },
    { label: 'Reorder level', value: part.reorderLevel },
    { label: 'Vendor', value: part.vendorName || 'No vendor' },
    { label: 'Shelf', value: details.shelfLocation || 'Not set' },
    { label: 'Vehicle', value: formatVehicle(details) },
    { label: 'Engine', value: details.compatibleEngine || 'Any engine' },
    { label: 'Warranty', value: details.warrantyPeriod || 'Not set' },
    { label: 'Added by', value: formatUserName(part.createdByUserName, part.createdByUserEmail) },
    { label: 'Added role', value: formatRole(part.createdByUserRole) },
    { label: 'Added on', value: formatDate(part.createdAt) },
    { label: 'Updated by', value: formatUserName(part.updatedByUserName, part.updatedByUserEmail) },
    { label: 'Updated role', value: formatRole(part.updatedByUserRole) },
    { label: 'Updated on', value: formatDate(part.updatedAt) },
  ]

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader
        eyebrow={part.isLowStock ? 'Low stock' : 'Part details'}
        icon={part.isLowStock ? AlertTriangle : Package}
        onClose={onClose}
        title={part.name}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" key={label}>
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || 'Not set'}</p>
          </div>
        ))}
      </div>

      <DetailBlock label="Description" value={details.description || 'No description added.'} />
      <DetailBlock label="Notes" value={details.notes || 'No notes added.'} />

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
          type="button"
          onClick={() => onEdit(part)}
        >
          <Edit3 size={18} />
          Edit part
        </button>
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

function toPartPayload(data) {
  return {
    ...data,
    unitCost: Number(data.unitCost || 0),
    sellingPrice: Number(data.sellingPrice || 0),
    quantityInStock: Number.parseInt(data.quantityInStock || '0', 10),
    reorderLevel: Number.parseInt(data.reorderLevel || '10', 10),
    vendorId: data.vendorId ? Number.parseInt(data.vendorId, 10) : null,
    isActive: true,
  }
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

function formatVehicle(details) {
  return [details.vehicleMake, details.vehicleModel, details.vehicleYear].filter(Boolean).join(' ') || 'Universal'
}

function formatUserName(name, email) {
  return name || email || 'Not recorded'
}

function formatRole(role) {
  return role || 'No role'
}
