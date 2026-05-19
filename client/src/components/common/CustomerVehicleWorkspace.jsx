import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Car, Edit3, Eye, Gauge, Plus, RefreshCw, Search, Star, Trash2, UserRound, Wrench, X } from 'lucide-react'
import {
  createCustomerVehicle,
  createMyVehicle,
  deleteCustomerVehicle,
  deleteMyVehicle,
  getCustomerVehicles,
  getMyVehicles,
  searchCustomerVehicles,
  searchVehicleCustomers,
  analyzeVehicleHealth,
  getLatestVehicleHealthPrediction,
  getVehicleHealthPredictionHistory,
  updateCustomerVehicle,
  updateMyVehicle,
  uploadVehicleImage,
} from '../../lib/auth'

const initialFormData = {
  vehicleNumber: '',
  make: '',
  model: '',
  year: '',
  color: '',
  fuelType: '',
  imageUrl: '',
  engineNumber: '',
  chassisNumber: '',
  mileage: '',
  isPrimary: false,
  notes: '',
}

export function CustomerVehicleManagement() {
  const [vehicles, setVehicles] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUploadStatus, setImageUploadStatus] = useState('')
  const hasSidePanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadVehicles() {
      try {
        const data = await getMyVehicles()
        if (isMounted) {
          setVehicles(data)
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

    loadVehicles()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredVehicles = useFilteredVehicles(vehicles, query)

  function openCreatePanel() {
    setMode('create')
    setSelectedVehicle(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
    setImageUploadStatus('')
  }

  function openEditPanel(vehicle) {
    setMode('edit')
    setSelectedVehicle(vehicle)
    setFormData(toVehicleForm(vehicle))
    setError('')
    setMessage('')
    setImageUploadStatus('')
  }

  function openViewPanel(vehicle) {
    setMode('view')
    setSelectedVehicle(vehicle)
    setError('')
    setMessage('')
  }

  function closeSidePanel() {
    setMode('list')
    setSelectedVehicle(null)
    setFormData(initialFormData)
    setError('')
    setImageUploadStatus('')
  }

  function handleChange(event) {
    const { checked, name, type, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setImageUploadStatus('Uploading vehicle image...')

    try {
      const upload = await uploadVehicleImage(file)
      setFormData((current) => ({
        ...current,
        imageUrl: upload.url,
      }))
      setImageUploadStatus('Vehicle image uploaded.')
    } catch (exception) {
      setImageUploadStatus('')
      setError(exception.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const payload = toVehiclePayload(formData)

      if (mode === 'edit' && selectedVehicle) {
        const updatedVehicle = await updateMyVehicle(selectedVehicle.customerVehicleId, payload)
        setVehicles((current) => replaceVehicle(current, updatedVehicle))
        setSelectedVehicle(updatedVehicle)
        setMessage('Vehicle details updated.')
        setMode('view')
      } else {
        const createdVehicle = await createMyVehicle(payload)
        setVehicles((current) => normalizePrimaryVehicles([createdVehicle, ...current], createdVehicle))
        setSelectedVehicle(createdVehicle)
        setMessage('Vehicle added successfully.')
        setMode('view')
      }

      setFormData(initialFormData)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(vehicle) {
    const shouldDelete = window.confirm(`Remove ${vehicle.vehicleNumber} from your vehicles?`)
    if (!shouldDelete) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteMyVehicle(vehicle.customerVehicleId)
      const refreshedVehicles = await getMyVehicles()
      setVehicles(refreshedVehicles)
      setMessage('Vehicle removed.')
      if (selectedVehicle?.customerVehicleId === vehicle.customerVehicleId) {
        closeSidePanel()
      }
    } catch (exception) {
      setError(exception.message)
    }
  }

  return (
    <VehicleWorkspaceLayout
      error={error}
      filteredVehicles={filteredVehicles}
      formData={formData}
      hasSidePanel={hasSidePanel}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      message={message}
      mode={mode}
      onAdd={openCreatePanel}
      onChange={handleChange}
      onClose={closeSidePanel}
      onDelete={handleDelete}
      onEdit={openEditPanel}
      onImageChange={handleImageChange}
      onQueryChange={setQuery}
      onSubmit={handleSubmit}
      onView={openViewPanel}
      query={query}
      selectedVehicle={selectedVehicle}
      imageUploadStatus={imageUploadStatus}
      tableEyebrow="My vehicles"
      tableTitle="Vehicle Details"
    />
  )
}

export function StaffCustomerVehicleManagement() {
  const [customers, setCustomers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [mode, setMode] = useState('list')
  const [customerQuery, setCustomerQuery] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUploadStatus, setImageUploadStatus] = useState('')
  const hasSidePanel = mode !== 'list'

  useEffect(() => {
    let isMounted = true

    async function loadStaffData() {
      try {
        const [customerData, vehicleData] = await Promise.all([
          searchVehicleCustomers(''),
          searchCustomerVehicles(''),
        ])
        if (isMounted) {
          setCustomers(customerData)
          setVehicles(vehicleData)
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

    loadStaffData()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleCustomerSearch(value) {
    setCustomerQuery(value)
    try {
      setCustomers(await searchVehicleCustomers(value))
    } catch (exception) {
      setError(exception.message)
    }
  }

  async function handleVehicleSearch(value) {
    setVehicleQuery(value)
    setSelectedCustomer(null)
    try {
      setVehicles(await searchCustomerVehicles(value))
    } catch (exception) {
      setError(exception.message)
    }
  }

  async function selectCustomer(customer) {
    setSelectedCustomer(customer)
    setMode('list')
    setSelectedVehicle(null)
    setError('')
    setMessage('')
    setVehicles(await getCustomerVehicles(customer.customerId))
  }

  function openCreatePanel(customer = selectedCustomer) {
    if (!customer) {
      setError('Select a customer before adding a vehicle.')
      return
    }

    setMode('create')
    setSelectedCustomer(customer)
    setSelectedVehicle(null)
    setFormData(initialFormData)
    setError('')
    setMessage('')
    setImageUploadStatus('')
  }

  function openEditPanel(vehicle) {
    setMode('edit')
    setSelectedVehicle(vehicle)
    setFormData(toVehicleForm(vehicle))
    setError('')
    setMessage('')
    setImageUploadStatus('')
  }

  function openViewPanel(vehicle) {
    setMode('view')
    setSelectedVehicle(vehicle)
    setError('')
    setMessage('')
  }

  function closeSidePanel() {
    setMode('list')
    setSelectedVehicle(null)
    setFormData(initialFormData)
    setError('')
    setImageUploadStatus('')
  }

  function handleChange(event) {
    const { checked, name, type, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setImageUploadStatus('Uploading vehicle image...')

    try {
      const upload = await uploadVehicleImage(file)
      setFormData((current) => ({
        ...current,
        imageUrl: upload.url,
      }))
      setImageUploadStatus('Vehicle image uploaded.')
    } catch (exception) {
      setImageUploadStatus('')
      setError(exception.message)
    }
  }

  async function refreshVehiclesForCurrentContext(customer = selectedCustomer) {
    if (customer) {
      setVehicles(await getCustomerVehicles(customer.customerId))
      setCustomers(await searchVehicleCustomers(customerQuery))
      return
    }

    setVehicles(await searchCustomerVehicles(vehicleQuery))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!selectedCustomer && mode === 'create') {
      setError('Select a customer before adding a vehicle.')
      return
    }

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const payload = toVehiclePayload(formData)

      if (mode === 'edit' && selectedVehicle) {
        const updatedVehicle = await updateCustomerVehicle(selectedVehicle.customerVehicleId, payload)
        setVehicles((current) => replaceVehicle(current, updatedVehicle))
        setSelectedVehicle(updatedVehicle)
        setMessage('Vehicle details updated.')
        setMode('view')
      } else {
        const createdVehicle = await createCustomerVehicle(selectedCustomer.customerId, payload)
        setVehicles((current) => normalizePrimaryVehicles([createdVehicle, ...current], createdVehicle))
        setSelectedVehicle(createdVehicle)
        setMessage('Vehicle added successfully.')
        setMode('view')
      }

      await refreshVehiclesForCurrentContext()
      setFormData(initialFormData)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(vehicle) {
    const customerLabel = getCustomerDisplayName({
      fullName: vehicle.customerName,
      email: vehicle.customerEmail,
      customerId: vehicle.customerId,
    })
    const shouldDelete = window.confirm(`Remove ${vehicle.vehicleNumber} from ${customerLabel}'s vehicles?`)
    if (!shouldDelete) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteCustomerVehicle(vehicle.customerVehicleId)
      await refreshVehiclesForCurrentContext()
      setMessage('Vehicle removed.')
      if (selectedVehicle?.customerVehicleId === vehicle.customerVehicleId) {
        closeSidePanel()
      }
    } catch (exception) {
      setError(exception.message)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Customer lookup</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Customers & Vehicles</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SearchField onChange={handleCustomerSearch} placeholder="Search customers" value={customerQuery} />
            <SearchField onChange={handleVehicleSearch} placeholder="Search vehicle number" value={vehicleQuery} />
          </div>
        </div>

        <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {customers.map((customer) => {
            const isSelected = selectedCustomer?.customerId === customer.customerId
            return (
              <button
                className={`min-w-64 rounded-lg border px-4 py-3 text-left transition ${
                  isSelected
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
                key={customer.customerId}
                type="button"
                onClick={() => selectCustomer(customer)}
              >
                <p className="text-sm font-black text-slate-950">{getCustomerDisplayName(customer)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{customer.phone || customer.email}</p>
                <p className="mt-2 text-xs font-black uppercase text-red-600">{customer.vehicleCount} vehicle(s)</p>
              </button>
            )
          })}
        </div>
      </section>

      <VehicleWorkspaceLayout
        error={error}
        filteredVehicles={vehicles}
        formData={formData}
        hasSidePanel={hasSidePanel}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        imageUploadStatus={imageUploadStatus}
        message={message}
        mode={mode}
        onAdd={() => openCreatePanel()}
        onChange={handleChange}
        onClose={closeSidePanel}
        onDelete={handleDelete}
        onEdit={openEditPanel}
        onImageChange={handleImageChange}
        onQueryChange={handleVehicleSearch}
        onSubmit={handleSubmit}
        onView={openViewPanel}
        query={vehicleQuery}
        selectedVehicle={selectedVehicle}
        showCustomer
        tableEyebrow={selectedCustomer ? `Selected customer ${getCustomerDisplayName(selectedCustomer)}` : 'Vehicle search'}
        tableTitle={selectedCustomer ? `${getCustomerDisplayName(selectedCustomer)}'s Vehicles` : 'Customer Vehicle Directory'}
      />
    </div>
  )
}

function VehicleWorkspaceLayout({
  error,
  filteredVehicles,
  formData,
  hasSidePanel,
  isLoading,
  isSubmitting,
  imageUploadStatus,
  message,
  mode,
  onAdd,
  onChange,
  onClose,
  onDelete,
  onEdit,
  onImageChange,
  onQueryChange,
  onSubmit,
  onView,
  query,
  selectedVehicle,
  showCustomer = false,
  tableEyebrow,
  tableTitle,
}) {
  return (
    <div className={`grid gap-6 ${hasSidePanel ? 'xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.72fr)]' : ''}`}>
      <VehicleTable
        error={error}
        hasSidePanel={hasSidePanel}
        isLoading={isLoading}
        message={message}
        onAdd={onAdd}
        onDelete={onDelete}
        onEdit={onEdit}
        onQueryChange={onQueryChange}
        onView={onView}
        query={query}
        selectedVehicleId={selectedVehicle?.customerVehicleId}
        showCustomer={showCustomer}
        tableEyebrow={tableEyebrow}
        tableTitle={tableTitle}
        vehicles={filteredVehicles}
      />

      {hasSidePanel && (
        mode === 'view' ? (
          <VehicleDetailsPanel
            onClose={onClose}
            onEdit={onEdit}
            showCustomer={showCustomer}
            vehicle={selectedVehicle}
          />
        ) : (
          <VehicleFormPanel
            formData={formData}
            isEditing={mode === 'edit'}
            isSubmitting={isSubmitting}
            imageUploadStatus={imageUploadStatus}
            onChange={onChange}
            onClose={onClose}
            onImageChange={onImageChange}
            onSubmit={onSubmit}
          />
        )
      )}
    </div>
  )
}

function VehicleTable({
  error,
  hasSidePanel,
  isLoading,
  message,
  onAdd,
  onDelete,
  onEdit,
  onQueryChange,
  onView,
  query,
  selectedVehicleId,
  showCustomer,
  tableEyebrow,
  tableTitle,
  vehicles,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">{tableEyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{tableTitle}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchField onChange={onQueryChange} placeholder="Search vehicles" value={query} />
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
            type="button"
            onClick={onAdd}
          >
            <Plus size={18} />
            Add vehicle
          </button>
        </div>
      </div>

      {error && <Message tone="error">{error}</Message>}
      {message && <Message tone="success">{message}</Message>}

      <div className="mt-6 overflow-x-auto">
        <table className={`${hasSidePanel ? 'min-w-[720px]' : 'min-w-[980px]'} w-full border-collapse text-left`}>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
              <th className="py-3 pr-4">Vehicle</th>
              {showCustomer && <th className="py-3 pr-4">Customer</th>}
              <th className="py-3 pr-4">Details</th>
              {!hasSidePanel && <th className="py-3 pr-4">Identifiers</th>}
              <th className="py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={showCustomer ? 5 : 4}>
                  Loading vehicles...
                </td>
              </tr>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.customerVehicleId

                return (
                  <tr
                    className={`border-b border-slate-100 align-top last:border-0 ${isSelected ? 'bg-red-50/50' : ''}`}
                    key={vehicle.customerVehicleId}
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <VehicleImage imageUrl={vehicle.imageUrl} label={`${vehicle.make} ${vehicle.model}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-950">{vehicle.vehicleNumber}</p>
                            {vehicle.isPrimary && <Star className="fill-amber-400 text-amber-400" size={15} />}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{vehicle.make} {vehicle.model}</p>
                        </div>
                      </div>
                    </td>
                    {showCustomer && (
                      <td className="py-4 pr-4">
                        <p className="text-sm font-semibold text-slate-700">{getCustomerDisplayName({
                          fullName: vehicle.customerName,
                          email: vehicle.customerEmail,
                          customerId: vehicle.customerId,
                        })}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{vehicle.customerPhone || vehicle.customerEmail}</p>
                      </td>
                    )}
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold text-slate-700">{[vehicle.year, vehicle.color, vehicle.fuelType].filter(Boolean).join(' / ') || 'Not set'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{formatMileage(vehicle.mileage)}</p>
                    </td>
                    {!hasSidePanel && (
                      <td className="py-4 pr-4">
                        <p className="max-w-48 truncate text-sm font-semibold text-slate-700">{vehicle.engineNumber || 'No engine number'}</p>
                        <p className="mt-1 max-w-48 truncate text-xs font-semibold text-slate-500">{vehicle.chassisNumber || 'No chassis number'}</p>
                      </td>
                    )}
                    <td className="py-4">
                      <div className="flex gap-2">
                        <IconButton label={`View ${vehicle.vehicleNumber}`} onClick={() => onView(vehicle)}>
                          <Eye size={16} />
                        </IconButton>
                        <IconButton label={`Edit ${vehicle.vehicleNumber}`} onClick={() => onEdit(vehicle)}>
                          <Edit3 size={16} />
                        </IconButton>
                        <IconButton danger label={`Delete ${vehicle.vehicleNumber}`} onClick={() => onDelete(vehicle)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="py-5 text-sm font-semibold text-slate-600" colSpan={showCustomer ? 5 : 4}>
                  No vehicles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VehicleFormPanel({
  formData,
  imageUploadStatus,
  isEditing,
  isSubmitting,
  onChange,
  onClose,
  onImageChange,
  onSubmit,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader eyebrow="Vehicle details" icon={Car} onClose={onClose} title={isEditing ? 'Edit Vehicle' : 'Add Vehicle'} />

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <TextField label="Vehicle number" name="vehicleNumber" onChange={onChange} required value={formData.vehicleNumber} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Make" name="make" onChange={onChange} required value={formData.make} />
          <TextField label="Model" name="model" onChange={onChange} required value={formData.model} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Year" name="year" onChange={onChange} value={formData.year} />
          <TextField label="Color" name="color" onChange={onChange} value={formData.color} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <TextField label="Fuel type" name="fuelType" onChange={onChange} value={formData.fuelType} />
          <TextField label="Mileage" min="0" name="mileage" onChange={onChange} type="number" value={formData.mileage} />
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Vehicle image
          <span className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {formData.imageUrl ? (
              <img className="h-40 w-full rounded-lg object-cover" src={formData.imageUrl} alt={`${formData.make} ${formData.model}`} />
            ) : (
              <span className="grid h-40 place-items-center rounded-lg bg-white text-slate-400">
                <Car size={42} />
              </span>
            )}
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-black file:text-white"
              type="file"
              onChange={onImageChange}
            />
            {imageUploadStatus && <span className="text-xs font-bold text-slate-500">{imageUploadStatus}</span>}
          </span>
        </label>
        <TextField label="Engine number" name="engineNumber" onChange={onChange} value={formData.engineNumber} />
        <TextField label="Chassis number" name="chassisNumber" onChange={onChange} value={formData.chassisNumber} />

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
          <input
            className="h-4 w-4 accent-[var(--primary)]"
            checked={formData.isPrimary}
            name="isPrimary"
            onChange={onChange}
            type="checkbox"
          />
          Primary vehicle
        </label>

        <TextareaField label="Notes" name="notes" onChange={onChange} value={formData.notes} />

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            <Plus size={18} />
            {isSubmitting ? 'Saving...' : isEditing ? 'Update vehicle' : 'Add vehicle'}
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

function VehicleDetailsPanel({ onClose, onEdit, showCustomer, vehicle }) {
  const vehicleId = vehicle?.customerVehicleId
  const [prediction, setPrediction] = useState(null)
  const [predictionHistory, setPredictionHistory] = useState([])
  const [isPredictionLoading, setIsPredictionLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [healthError, setHealthError] = useState('')
  const [healthMessage, setHealthMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadLatestPrediction() {
      if (!vehicleId) {
        return
      }

      setHealthError('')
      setHealthMessage('')
      setPrediction(null)
      setPredictionHistory([])
      setShowHistory(false)
      setIsPredictionLoading(true)

      try {
        const latestPrediction = await getLatestVehicleHealthPrediction(vehicleId)
        if (isMounted) {
          setPrediction(latestPrediction)
        }
      } catch (exception) {
        if (!isMounted) {
          return
        }

        if (isPredictionNotFoundError(exception.message)) {
          setHealthMessage('No AI prediction found yet. Run analysis to generate one.')
        } else {
          setHealthError(exception.message)
        }
      } finally {
        if (isMounted) {
          setIsPredictionLoading(false)
        }
      }
    }

    loadLatestPrediction()

    return () => {
      isMounted = false
    }
  }, [vehicleId])

  async function handleAnalyze(forceRefresh = false) {
    if (!vehicleId) {
      return
    }

    setHealthError('')
    setHealthMessage('')
    setIsPredictionLoading(true)

    try {
      const analyzedPrediction = await analyzeVehicleHealth(vehicleId, { forceRefresh })
      setPrediction(analyzedPrediction)
      setHealthMessage(forceRefresh ? 'Vehicle health prediction refreshed.' : 'Vehicle health prediction generated.')

      if (showHistory) {
        await loadPredictionHistory()
      }
    } catch (exception) {
      setHealthError(exception.message)
    } finally {
      setIsPredictionLoading(false)
    }
  }

  async function loadPredictionHistory() {
    if (!vehicleId) {
      return
    }

    setIsHistoryLoading(true)
    setHealthError('')

    try {
      const history = await getVehicleHealthPredictionHistory(vehicleId, 8)
      setPredictionHistory(history)
    } catch (exception) {
      setHealthError(exception.message)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  async function handleToggleHistory() {
    const nextValue = !showHistory
    setShowHistory(nextValue)

    if (nextValue && predictionHistory.length === 0) {
      await loadPredictionHistory()
    }
  }

  if (!vehicle) {
    return null
  }

  const rows = [
    { label: 'Vehicle ID', value: vehicle.customerVehicleId },
    { label: 'Vehicle number', value: vehicle.vehicleNumber },
    { label: 'Make', value: vehicle.make },
    { label: 'Model', value: vehicle.model },
    { label: 'Year', value: vehicle.year || 'Not set' },
    { label: 'Color', value: vehicle.color || 'Not set' },
    { label: 'Fuel type', value: vehicle.fuelType || 'Not set' },
    { label: 'Image URL', value: vehicle.imageUrl || 'Not set' },
    { label: 'Mileage', value: formatMileage(vehicle.mileage) },
    { label: 'Engine number', value: vehicle.engineNumber || 'Not set' },
    { label: 'Chassis number', value: vehicle.chassisNumber || 'Not set' },
    { label: 'Primary', value: vehicle.isPrimary ? 'Yes' : 'No' },
    { label: 'Added on', value: formatDate(vehicle.createdAt) },
    { label: 'Updated on', value: formatDate(vehicle.updatedAt) },
  ]

  if (showCustomer) {
    rows.splice(1, 0, {
      label: 'Customer',
      value: `${getCustomerDisplayName({
        fullName: vehicle.customerName,
        email: vehicle.customerEmail,
        customerId: vehicle.customerId,
      })} (${vehicle.customerPhone || vehicle.customerEmail})`,
    })
  }

  const predictedFailures = toPredictionList(prediction?.predictedFailures)
  const recommendedParts = toPredictionList(prediction?.recommendedParts)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelHeader eyebrow="Vehicle profile" icon={UserRound} onClose={onClose} title={vehicle.vehicleNumber} />

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {vehicle.imageUrl ? (
          <img className="h-56 w-full object-cover" src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} />
        ) : (
          <div className="grid h-56 place-items-center text-slate-400">
            <Car size={52} />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" key={label}>
            <p className="text-xs font-black uppercase text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || 'Not set'}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-black uppercase text-slate-500">Notes</p>
        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-700">
          {vehicle.notes || 'No notes added.'}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Vehicle AI</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Health analysis</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              disabled={isPredictionLoading}
              onClick={() => handleAnalyze(false)}
            >
              <Activity size={15} />
              {prediction ? 'Analyze again' : 'Analyze vehicle'}
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              disabled={isPredictionLoading}
              onClick={() => handleAnalyze(true)}
            >
              <RefreshCw className={isPredictionLoading ? 'animate-spin' : ''} size={15} />
              Refresh
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={handleToggleHistory}
            >
              <Gauge size={15} />
              {showHistory ? 'Hide history' : 'View history'}
            </button>
          </div>
        </div>

        {healthError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {healthError}
          </p>
        )}

        {healthMessage && !healthError && (
          <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
            {healthMessage}
          </p>
        )}

        {isPredictionLoading && !prediction ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            Generating AI prediction...
          </p>
        ) : prediction ? (
          <div className="mt-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-black uppercase text-slate-500">Risk level</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${getRiskBadgeClass(prediction.riskLevel)}`}>
                  {prediction.riskLevel || 'medium'}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-black uppercase text-slate-500">Urgency</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${getUrgencyBadgeClass(prediction.urgency)}`}>
                  {prediction.urgency || 'normal'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-black uppercase text-slate-500">Next check mileage</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {prediction.nextCheckMileage !== null && prediction.nextCheckMileage !== undefined
                    ? `${new Intl.NumberFormat('en').format(prediction.nextCheckMileage)} km`
                    : 'Not set'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-black uppercase text-slate-500">Next check date</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(prediction.nextCheckDate)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-black uppercase text-slate-500">Reasoning</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{prediction.why || 'No explanation provided.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><AlertTriangle size={13} /> Predicted failures</p>
                {predictedFailures.length > 0 ? (
                  <ul className="mt-2 grid gap-1">
                    {predictedFailures.map((item) => (
                      <li className="text-sm font-semibold text-slate-700" key={item}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-600">No specific failures listed.</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><Wrench size={13} /> Recommended parts</p>
                {recommendedParts.length > 0 ? (
                  <ul className="mt-2 grid gap-1">
                    {recommendedParts.map((item) => (
                      <li className="text-sm font-semibold text-slate-700" key={item}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-600">No specific parts listed.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-xs font-black uppercase text-amber-700">Disclaimer</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">
                {prediction.disclaimer || 'AI guidance is supportive only. Confirm with a technician.'}
              </p>
              <p className="mt-2 text-xs font-bold text-amber-700">
                Generated {formatDateTime(prediction.generatedAt)} • model {prediction.modelUsed || 'N/A'}
              </p>
            </div>
          </div>
        ) : null}

        {showHistory && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-black uppercase text-slate-500">Prediction history</p>
            {isHistoryLoading ? (
              <p className="mt-2 text-sm font-semibold text-slate-600">Loading history...</p>
            ) : predictionHistory.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {predictionHistory.map((item) => (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2" key={item.vehicleHealthPredictionId}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase ${getRiskBadgeClass(item.riskLevel)}`}>
                        {item.riskLevel}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black uppercase ${getUrgencyBadgeClass(item.urgency)}`}>
                        {item.urgency}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{formatDateTime(item.generatedAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{item.why || 'No explanation provided.'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-600">No history found yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
          type="button"
          onClick={() => onEdit(vehicle)}
        >
          <Edit3 size={18} />
          Edit vehicle
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

function SearchField({ onChange, placeholder, value }) {
  return (
    <label className="relative block min-w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function VehicleImage({ imageUrl, label }) {
  return (
    <span className="grid h-12 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200">
      {imageUrl ? (
        <img className="h-full w-full object-cover" src={imageUrl} alt={label} />
      ) : (
        <Car size={22} />
      )}
    </span>
  )
}

function TextField({ label, min, name, onChange, required = false, type = 'text', value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        min={min}
        name={name}
        onChange={onChange}
        required={required}
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

function Message({ children, tone }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700'

  return (
    <p className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${toneClass}`}>
      {children}
    </p>
  )
}

function useFilteredVehicles(vehicles, query) {
  return useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return vehicles
    }

    return vehicles.filter((vehicle) => [
      vehicle.vehicleNumber,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.color,
      vehicle.fuelType,
      vehicle.customerName,
      vehicle.customerPhone,
      vehicle.customerEmail,
      vehicle.engineNumber,
      vehicle.chassisNumber,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery)))
  }, [query, vehicles])
}

function toVehicleForm(vehicle) {
  return {
    vehicleNumber: vehicle.vehicleNumber ?? '',
    make: vehicle.make ?? '',
    model: vehicle.model ?? '',
    year: vehicle.year ?? '',
    color: vehicle.color ?? '',
    fuelType: vehicle.fuelType ?? '',
    imageUrl: vehicle.imageUrl ?? '',
    engineNumber: vehicle.engineNumber ?? '',
    chassisNumber: vehicle.chassisNumber ?? '',
    mileage: vehicle.mileage ? String(vehicle.mileage) : '',
    isPrimary: Boolean(vehicle.isPrimary),
    notes: vehicle.notes ?? '',
  }
}

function toVehiclePayload(data) {
  return {
    ...data,
    mileage: data.mileage === '' ? null : Number.parseInt(data.mileage, 10),
    isActive: true,
  }
}

function replaceVehicle(vehicles, updatedVehicle) {
  return normalizePrimaryVehicles(
    vehicles.map((vehicle) => (
      vehicle.customerVehicleId === updatedVehicle.customerVehicleId ? updatedVehicle : vehicle
    )),
    updatedVehicle,
  )
}

function normalizePrimaryVehicles(vehicles, updatedVehicle) {
  if (!updatedVehicle.isPrimary) {
    return vehicles
  }

  return vehicles.map((vehicle) => (
    vehicle.customerId === updatedVehicle.customerId
      ? { ...vehicle, isPrimary: vehicle.customerVehicleId === updatedVehicle.customerVehicleId }
      : vehicle
  ))
}

function getCustomerDisplayName(customer) {
  const displayName = (customer?.fullName || customer?.customerName || customer?.name || '').trim()
  if (displayName) {
    return displayName
  }

  const customerId = customer?.customerId ?? customer?.id
  return customerId ? `Customer #${customerId}` : 'Profile pending'
}


function isPredictionNotFoundError(message) {
  const normalizedMessage = String(message ?? '').toLowerCase()
  return normalizedMessage.includes('no prediction found')
}

function toPredictionList(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => String(item ?? '').trim())
    .filter((item, index, list) => item.length > 0 && list.indexOf(item) === index)
}

function getRiskBadgeClass(riskLevel) {
  switch ((riskLevel || '').toLowerCase()) {
    case 'critical':
      return 'border border-rose-300 bg-rose-100 text-rose-800'
    case 'high':
      return 'border border-orange-300 bg-orange-100 text-orange-800'
    case 'medium':
      return 'border border-amber-300 bg-amber-100 text-amber-800'
    case 'low':
      return 'border border-emerald-300 bg-emerald-100 text-emerald-800'
    default:
      return 'border border-slate-300 bg-slate-100 text-slate-700'
  }
}

function getUrgencyBadgeClass(urgency) {
  switch ((urgency || '').toLowerCase()) {
    case 'urgent':
      return 'border border-rose-300 bg-rose-100 text-rose-800'
    case 'high':
      return 'border border-orange-300 bg-orange-100 text-orange-800'
    case 'normal':
      return 'border border-blue-300 bg-blue-100 text-blue-800'
    case 'low':
      return 'border border-emerald-300 bg-emerald-100 text-emerald-800'
    default:
      return 'border border-slate-300 bg-slate-100 text-slate-700'
  }
}

function formatDateTime(value) {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
function formatMileage(value) {
  if (value === null || value === undefined) {
    return 'Mileage not set'
  }

  return `${new Intl.NumberFormat('en').format(value)} km`
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
