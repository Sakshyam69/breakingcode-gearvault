import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Car,
  Clock3,
  Gauge,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
} from 'lucide-react'
import {
  analyzeVehicleHealth,
  getLatestVehicleHealthPrediction,
  getMyVehicles,
  getVehicleHealthPredictionHistory,
  searchCustomerVehicles,
} from '../../lib/auth'

export function VehicleAiServicesWorkspace({ scope = 'customer' }) {
  const normalizedScope = String(scope || 'customer').toLowerCase()
  const canSeeAllCustomers = normalizedScope === 'staff' || normalizedScope === 'admin'

  const [vehicles, setVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true)

  const [prediction, setPrediction] = useState(null)
  const [predictionHistory, setPredictionHistory] = useState([])
  const [isPredictionLoading, setIsPredictionLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadVehicles() {
      setError('')
      setMessage('')
      setIsLoadingVehicles(true)

      try {
        if (canSeeAllCustomers) {
          const query = `${customerQuery} ${vehicleQuery}`.trim()
          const result = await searchCustomerVehicles(query)
          if (isMounted) {
            setVehicles(result)
          }
        } else {
          const result = await getMyVehicles()
          if (isMounted) {
            setVehicles(result)
          }
        }
      } catch (exception) {
        if (isMounted) {
          setError(exception.message)
        }
      } finally {
        if (isMounted) {
          setIsLoadingVehicles(false)
        }
      }
    }

    loadVehicles()

    return () => {
      isMounted = false
    }
  }, [canSeeAllCustomers, customerQuery, vehicleQuery])

  useEffect(() => {
    if (!selectedVehicle) {
      return
    }

    const stillExists = vehicles.some((vehicle) => vehicle.customerVehicleId === selectedVehicle.customerVehicleId)
    if (!stillExists) {
      setSelectedVehicle(null)
      setPrediction(null)
      setPredictionHistory([])
    }
  }, [selectedVehicle, vehicles])

  const visibleVehicles = useMemo(() => {
    if (canSeeAllCustomers) {
      return vehicles
    }

    const query = vehicleQuery.trim().toLowerCase()
    if (!query) {
      return vehicles
    }

    return vehicles.filter((vehicle) => {
      return [
        vehicle.vehicleNumber,
        vehicle.make,
        vehicle.model,
        vehicle.year,
        vehicle.color,
        vehicle.fuelType,
        vehicle.engineNumber,
        vehicle.chassisNumber,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
  }, [canSeeAllCustomers, vehicleQuery, vehicles])

  async function loadPredictionForVehicle(vehicle, { includeHistory = true } = {}) {
    if (!vehicle?.customerVehicleId) {
      return
    }

    setError('')
    setMessage('')
    setIsPredictionLoading(true)

    try {
      const latestPrediction = await getLatestVehicleHealthPrediction(vehicle.customerVehicleId)
      setPrediction(latestPrediction)
    } catch (exception) {
      if (isPredictionNotFoundError(exception.message)) {
        setPrediction(null)
      } else {
        setError(exception.message)
      }
    } finally {
      setIsPredictionLoading(false)
    }

    if (includeHistory) {
      await loadHistoryForVehicle(vehicle.customerVehicleId)
    }
  }

  async function loadHistoryForVehicle(vehicleId) {
    if (!vehicleId) {
      return
    }

    setIsHistoryLoading(true)

    try {
      const history = await getVehicleHealthPredictionHistory(vehicleId, 10)
      setPredictionHistory(history)
    } catch (exception) {
      setPredictionHistory([])
      setError(exception.message)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  async function handleSelectVehicle(vehicle) {
    setSelectedVehicle(vehicle)
    await loadPredictionForVehicle(vehicle)
  }

  async function handleAnalyze(vehicle, forceRefresh = false) {
    if (!vehicle?.customerVehicleId) {
      return
    }

    setSelectedVehicle(vehicle)
    setError('')
    setMessage('')
    setIsAnalyzing(true)

    try {
      const analyzedPrediction = await analyzeVehicleHealth(vehicle.customerVehicleId, { forceRefresh })
      setPrediction(analyzedPrediction)
      await loadHistoryForVehicle(vehicle.customerVehicleId)
      setMessage(forceRefresh ? 'AI prediction refreshed.' : 'AI prediction generated.')
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">AI services</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Vehicle health analysis</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              AI analysis is optional support. Staff and admin can analyze all customer vehicles. Customers can analyze only their own vehicles.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {canSeeAllCustomers ? (
              <>
                <SearchField
                  placeholder="Search customer"
                  value={customerQuery}
                  onChange={setCustomerQuery}
                />
                <SearchField
                  placeholder="Search vehicle"
                  value={vehicleQuery}
                  onChange={setVehicleQuery}
                />
              </>
            ) : (
              <SearchField
                placeholder="Search your vehicles"
                value={vehicleQuery}
                onChange={setVehicleQuery}
              />
            )}
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {message && !error && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </p>
      )}

      <div className={`grid gap-6 ${selectedVehicle ? 'xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.72fr)]' : ''}`}>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Vehicles</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Choose vehicle and analyze</h3>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[960px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                  <th className="py-3 pr-4">Vehicle</th>
                  {canSeeAllCustomers && <th className="py-3 pr-4">Customer</th>}
                  <th className="py-3 pr-4">Details</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingVehicles ? (
                  <tr>
                    <td className="py-5 text-sm font-semibold text-slate-600" colSpan={canSeeAllCustomers ? 4 : 3}>
                      Loading vehicles...
                    </td>
                  </tr>
                ) : visibleVehicles.length > 0 ? (
                  visibleVehicles.map((vehicle) => {
                    const isSelected = selectedVehicle?.customerVehicleId === vehicle.customerVehicleId
                    const isBusy = isAnalyzing && isSelected

                    return (
                      <tr
                        className={`border-b border-slate-100 align-top last:border-0 ${isSelected ? 'bg-red-50/50' : ''}`}
                        key={vehicle.customerVehicleId}
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <VehicleImage imageUrl={vehicle.imageUrl} label={`${vehicle.make} ${vehicle.model}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-950">{vehicle.vehicleNumber}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">{vehicle.make} {vehicle.model}</p>
                            </div>
                          </div>
                        </td>

                        {canSeeAllCustomers && (
                          <td className="py-4 pr-4">
                            <p className="text-sm font-semibold text-slate-700">{getCustomerDisplayName(vehicle)}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{vehicle.customerPhone || vehicle.customerEmail}</p>
                          </td>
                        )}

                        <td className="py-4 pr-4">
                          <p className="text-sm font-semibold text-slate-700">{[vehicle.year, vehicle.color, vehicle.fuelType].filter(Boolean).join(' / ') || 'Not set'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatMileage(vehicle.mileage)}</p>
                        </td>

                        <td className="py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAnalyze(vehicle)}
                            >
                              <Activity size={14} />
                              {isBusy ? 'Analyzing...' : 'Analyze'}
                            </button>
                            <button
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
                              type="button"
                              onClick={() => handleSelectVehicle(vehicle)}
                            >
                              <Gauge size={14} />
                              Open
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td className="py-5 text-sm font-semibold text-slate-600" colSpan={canSeeAllCustomers ? 4 : 3}>
                      No vehicles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedVehicle && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-red-600">Selected vehicle</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{selectedVehicle.vehicleNumber}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">{selectedVehicle.make} {selectedVehicle.model}</p>
                {canSeeAllCustomers && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {getCustomerDisplayName(selectedVehicle)} • {selectedVehicle.customerPhone || selectedVehicle.customerEmail}
                  </p>
                )}
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
                <UserRound size={22} />
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleAnalyze(selectedVehicle, false)}
              >
                <Activity size={15} />
                {prediction ? 'Analyze again' : 'Analyze vehicle'}
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleAnalyze(selectedVehicle, true)}
              >
                <RefreshCw className={isAnalyzing ? 'animate-spin' : ''} size={15} />
                Refresh
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                disabled={isHistoryLoading}
                onClick={() => loadHistoryForVehicle(selectedVehicle.customerVehicleId)}
              >
                <Clock3 size={15} />
                Reload history
              </button>
            </div>

            {isPredictionLoading && !prediction ? (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                Loading latest prediction...
              </p>
            ) : prediction ? (
              <div className="mt-4 grid gap-3">
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

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-black uppercase text-slate-500">Reasoning</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{prediction.why || 'No explanation provided.'}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><AlertTriangle size={13} /> Predicted failures</p>
                    {toPredictionList(prediction.predictedFailures).length > 0 ? (
                      <ul className="mt-2 grid gap-1">
                        {toPredictionList(prediction.predictedFailures).map((item) => (
                          <li className="text-sm font-semibold text-slate-700" key={item}>• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-slate-600">No specific failures listed.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500"><Wrench size={13} /> Recommended parts</p>
                    {toPredictionList(prediction.recommendedParts).length > 0 ? (
                      <ul className="mt-2 grid gap-1">
                        {toPredictionList(prediction.recommendedParts).map((item) => (
                          <li className="text-sm font-semibold text-slate-700" key={item}>• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-slate-600">No specific parts listed.</p>
                    )}
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
            ) : (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                No AI prediction yet. Click analyze to generate one.
              </p>
            )}

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
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
          </section>
        )}
      </div>
    </div>
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
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
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
