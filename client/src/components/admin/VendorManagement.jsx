import { useEffect, useMemo, useState } from 'react'
import { Building2, Edit3, Eye, Plus, Search, Trash2, X } from 'lucide-react'
import { createVendor, deleteVendor, getVendors, updateVendor } from '../../lib/auth'

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  contactPerson: '',
  address: '',
  city: '',
  country: 'Nepal',
  taxNumber: '',
  paymentTerms: '',
  bankName: '',
  bankAccountNumber: '',
  notes: '',
}

export function VendorManagement() {
  const [vendors, setVendors] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSidePanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadVendors() {
      try {
        const data = await getVendors()
        if (isMounted) {
          setVendors(data)
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

    loadVendors()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredVendors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return vendors
    }

    return vendors.filter((vendor) => {
      const details = vendor.details ?? {}
      return [
        vendor.name,
        vendor.email,
        vendor.phone,
        vendor.createdByUserName,
        vendor.createdByUserEmail,
        vendor.createdByUserRole,
        details.contactPerson,
        details.city,
        details.taxNumber,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery))
    })
  }, [query, vendors])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function openCreatePanel() {
    setMode('create')
    setSelectedVendor(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
  }

  function openEditPanel(vendor) {
    const details = vendor.details ?? {}

    setMode('edit')
    setSelectedVendor(vendor)
    setFormData({
      name: vendor.name ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      contactPerson: details.contactPerson ?? '',
      address: details.address ?? '',
      city: details.city ?? '',
      country: details.country ?? 'Nepal',
      taxNumber: details.taxNumber ?? '',
      paymentTerms: details.paymentTerms ?? '',
      bankName: details.bankName ?? '',
      bankAccountNumber: details.bankAccountNumber ?? '',
      notes: details.notes ?? '',
    })
    setError('')
    setMessage('')
  }

  function openViewPanel(vendor) {
    setMode('view')
    setSelectedVendor(vendor)
    setError('')
    setMessage('')
  }

  function closeSidePanel() {
    setMode('list')
    setSelectedVendor(null)
    setFormData(initialFormData)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        isActive: true,
      }

      if (mode === 'edit' && selectedVendor) {
        const updatedVendor = await updateVendor(selectedVendor.vendorId, payload)
        setVendors((current) => current.map((vendor) => (
          vendor.vendorId === selectedVendor.vendorId ? updatedVendor : vendor
        )))
        setSelectedVendor(updatedVendor)
        setMessage('Vendor details updated.')
        setMode('view')
      } else {
        const createdVendor = await createVendor(payload)
        setVendors((current) => [createdVendor, ...current])
        setSelectedVendor(createdVendor)
        setMessage('Vendor added successfully.')
        setMode('view')
      }

      setFormData(initialFormData)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(vendor) {
    const shouldDelete = window.confirm(`Delete ${vendor.name} from active vendors?`)
    if (!shouldDelete) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteVendor(vendor.vendorId)
      setVendors((current) => current.filter((item) => item.vendorId !== vendor.vendorId))
      setMessage('Vendor removed from active list.')
      if (selectedVendor?.vendorId === vendor.vendorId) {
        closeSidePanel()
      }
    } catch (exception) {
      setError(exception.message)
    }
  }

  return (
    <div className={`grid gap-6 ${hasSidePanel ? 'xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]' : ''}`}>
      <VendorTable
        error={error}
        filteredVendors={filteredVendors}
        hasSidePanel={hasSidePanel}
        isLoading={isLoading}
        message={message}
        onAdd={openCreatePanel}
        onDelete={handleDelete}
        onEdit={openEditPanel}
        onQueryChange={setQuery}
        onView={openViewPanel}
        query={query}
        selectedVendorId={selectedVendor?.vendorId}
      />

      {hasSidePanel && (
        mode === 'view' ? (
          <VendorDetailsPanel
            vendor={selectedVendor}
            onClose={closeSidePanel}
            onEdit={openEditPanel}
          />
        ) : (
          <VendorFormPanel
            formData={formData}
            isEditing={mode === 'edit'}
            isSubmitting={isSubmitting}
            onChange={handleChange}
            onClose={closeSidePanel}
            onSubmit={handleSubmit}
          />
        )
      )}
    </div>
  )
}

function VendorTable({
  error,
  filteredVendors,
  hasSidePanel,
  isLoading,
  message,
  onAdd,
  onDelete,
  onEdit,
  onQueryChange,
  onView,
  query,
  selectedVendorId,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Active vendors</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Vendor Directory</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search vendors"
              value={query}
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={onAdd}
          >
            <Plus size={18} />
            Add vendor
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
        <table className={`${hasSidePanel ? 'min-w-[660px]' : 'min-w-[980px]'} w-full border-collapse text-left`}>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
              <th className="py-3 pr-4">Vendor</th>
              <th className="py-3 pr-4">Contact</th>
              {!hasSidePanel && (
                <>
                  <th className="py-3 pr-4">Location</th>
                  <th className="py-3 pr-4">Payment</th>
                </>
              )}
              <th className="py-3 pr-4">Added by</th>
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={hasSidePanel ? 4 : 6}>
                  Loading vendors...
                </td>
              </tr>
            ) : filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => {
                const details = vendor.details ?? {}
                const isSelected = selectedVendorId === vendor.vendorId

                return (
                  <tr
                    className={`border-b border-slate-100 align-top last:border-0 ${isSelected ? 'bg-red-50/50' : ''}`}
                    key={vendor.vendorId}
                  >
                    <td className="py-4 pr-4">
                      <p className="text-sm font-black text-slate-950">{vendor.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{vendor.email || 'No email'}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-slate-700">{vendor.phone}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{details.contactPerson || 'No contact person'}</p>
                    </td>
                    {!hasSidePanel && (
                      <>
                        <td className="py-4 pr-4">
                          <p className="text-sm font-semibold text-slate-700">{formatLocation(details)}</p>
                          <p className="mt-1 max-w-48 truncate text-xs font-semibold text-slate-500">{details.address || 'No address'}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="text-sm font-semibold text-slate-700">{details.paymentTerms || 'Not set'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{details.taxNumber || 'No tax number'}</p>
                        </td>
                      </>
                    )}
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-slate-700">{formatUserName(vendor.createdByUserName, vendor.createdByUserEmail)}</p>
                      <p className="mt-1 text-xs font-black uppercase text-slate-500">{formatRole(vendor.createdByUserRole)}</p>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        <IconButton label={`View ${vendor.name}`} onClick={() => onView(vendor)}>
                          <Eye size={16} />
                        </IconButton>
                        <IconButton label={`Edit ${vendor.name}`} onClick={() => onEdit(vendor)}>
                          <Edit3 size={16} />
                        </IconButton>
                        <IconButton danger label={`Delete ${vendor.name}`} onClick={() => onDelete(vendor)}>
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
                  No vendors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VendorFormPanel({ formData, isEditing, isSubmitting, onChange, onClose, onSubmit }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader
        eyebrow="Vendors"
        icon={Building2}
        onClose={onClose}
        title={isEditing ? 'Edit Vendor' : 'Add Vendor'}
      />

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Vendor name" name="name" onChange={onChange} required value={formData.name} />
          <TextField label="Phone" name="phone" onChange={onChange} required type="tel" value={formData.phone} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Email" name="email" onChange={onChange} type="email" value={formData.email} />
          <TextField label="Contact person" name="contactPerson" onChange={onChange} value={formData.contactPerson} />
        </div>

        <TextField label="Address" name="address" onChange={onChange} required value={formData.address} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="City" name="city" onChange={onChange} required value={formData.city} />
          <TextField label="Country" name="country" onChange={onChange} required value={formData.country} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Tax number" name="taxNumber" onChange={onChange} value={formData.taxNumber} />
          <TextField label="Payment terms" name="paymentTerms" onChange={onChange} value={formData.paymentTerms} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Bank name" name="bankName" onChange={onChange} value={formData.bankName} />
          <TextField label="Bank account" name="bankAccountNumber" onChange={onChange} value={formData.bankAccountNumber} />
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Notes
          <textarea
            className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
            maxLength={500}
            name="notes"
            onChange={onChange}
            value={formData.notes}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <Plus size={18} />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update vendor' : 'Add vendor'}
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

function VendorDetailsPanel({ onClose, onEdit, vendor }) {
  if (!vendor) {
    return null
  }

  const details = vendor.details ?? {}
  const rows = [
    { label: 'Vendor ID', value: vendor.vendorId },
    { label: 'Phone', value: vendor.phone },
    { label: 'Email', value: vendor.email || 'No email' },
    { label: 'Contact person', value: details.contactPerson || 'Not set' },
    { label: 'City', value: details.city || 'Not set' },
    { label: 'Country', value: details.country || 'Not set' },
    { label: 'Tax number', value: details.taxNumber || 'Not set' },
    { label: 'Payment terms', value: details.paymentTerms || 'Not set' },
    { label: 'Bank name', value: details.bankName || 'Not set' },
    { label: 'Bank account', value: details.bankAccountNumber || 'Not set' },
    { label: 'Added by', value: formatUserName(vendor.createdByUserName, vendor.createdByUserEmail) },
    { label: 'Added role', value: formatRole(vendor.createdByUserRole) },
    { label: 'Added on', value: formatDate(vendor.createdAt) },
    { label: 'Updated by', value: formatUserName(vendor.updatedByUserName, vendor.updatedByUserEmail) },
    { label: 'Updated role', value: formatRole(vendor.updatedByUserRole) },
    { label: 'Updated on', value: formatDate(vendor.updatedAt) },
    { label: 'Address', value: details.address || 'Not set', wide: true },
  ]

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader
        eyebrow="Vendor details"
        icon={Eye}
        onClose={onClose}
        title={vendor.name}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value, wide }) => (
          <div
            className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 ${wide ? 'sm:col-span-2' : ''}`}
            key={label}
          >
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || 'Not set'}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-black uppercase text-slate-500">Notes</p>
        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-700">
          {details.notes || 'No notes added.'}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
          type="button"
          onClick={() => onEdit(vendor)}
        >
          <Edit3 size={18} />
          Edit vendor
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

function TextField({ label, name, onChange, required = false, type = 'text', value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        onChange={onChange}
        required={required}
        type={type}
        value={value}
      />
    </label>
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

function formatLocation(details) {
  return [details.city, details.country].filter(Boolean).join(', ') || 'No location'
}

function formatUserName(name, email) {
  return name || email || 'Not recorded'
}

function formatRole(role) {
  return role || 'No role'
}
