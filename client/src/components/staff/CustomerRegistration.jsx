import { useState } from 'react'
import { Car, Send, UserPlus, X } from 'lucide-react'
import { createCustomerAccount, createCustomerVehicle } from '../../lib/auth'

const initialFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  vehicleNumber: '',
  make: '',
  model: '',
  year: '',
  color: '',
  fuelType: '',
  engineNumber: '',
  chassisNumber: '',
  mileage: '',
  isPrimary: true,
  vehicleNotes: '',
}

export function CustomerRegistration() {
  const [formData, setFormData] = useState(initialFormData)
  const [createdRecord, setCreatedRecord] = useState(null)
  const [createdVehicle, setCreatedVehicle] = useState(null)
  const [addVehicleNow, setAddVehicleNow] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { checked, name, type, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleAddVehicleToggle(event) {
    setAddVehicleNow(event.target.checked)
  }

  function resetForm() {
    setFormData(initialFormData)
    setCreatedRecord(null)
    setCreatedVehicle(null)
    setAddVehicleNow(false)
    setError('')
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirm password must match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createCustomerAccount(toPayload(formData))
      setCreatedRecord(response.customer)
      setCreatedVehicle(null)

      const accountMessage = response.credentialEmailSent
        ? 'Customer account created and credentials emailed.'
        : 'Customer account created, but the credential email was not sent. Check Brevo settings.'

      if (addVehicleNow) {
        try {
          const vehicle = await createCustomerVehicle(response.customer.id, toVehiclePayload(formData))
          setCreatedVehicle(vehicle)
          setMessage(`${accountMessage} Vehicle details were also saved.`)
        } catch (vehicleException) {
          setMessage(accountMessage)
          setError(`Customer account was created, but vehicle details could not be saved: ${vehicleException.message}`)
        }
      } else {
        setMessage(accountMessage)
      }

      setFormData(initialFormData)
      setAddVehicleNow(false)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Staff</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Register Customer</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Create customer login credentials and optionally add their first vehicle now.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <UserPlus size={22} />
          </span>
        </div>

        <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
          <section className="grid gap-4">
            <TextField label="Customer email" name="email" onChange={handleChange} required type="email" value={formData.email} />
            <TextField label="Temporary password" minLength={8} name="password" onChange={handleChange} required type="password" value={formData.password} />
            <TextField label="Confirm password" minLength={8} name="confirmPassword" onChange={handleChange} required type="password" value={formData.confirmPassword} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-black text-slate-800">
              <input
                checked={addVehicleNow}
                className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-red-100"
                type="checkbox"
                onChange={handleAddVehicleToggle}
              />
              Add vehicle details now (optional)
            </label>

            {addVehicleNow && (
              <div className="mt-4 grid gap-4">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase text-red-600">
                  <Car size={15} />
                  Vehicle details
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Vehicle number" maxLength={40} minLength={2} name="vehicleNumber" onChange={handleChange} required={addVehicleNow} value={formData.vehicleNumber} />
                  <TextField label="Make" maxLength={120} minLength={2} name="make" onChange={handleChange} required={addVehicleNow} value={formData.make} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Model" maxLength={120} minLength={1} name="model" onChange={handleChange} required={addVehicleNow} value={formData.model} />
                  <TextField label="Year (optional)" maxLength={30} name="year" onChange={handleChange} value={formData.year} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Color (optional)" maxLength={60} name="color" onChange={handleChange} value={formData.color} />
                  <TextField label="Fuel type (optional)" maxLength={60} name="fuelType" onChange={handleChange} value={formData.fuelType} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Engine number (optional)" maxLength={120} name="engineNumber" onChange={handleChange} value={formData.engineNumber} />
                  <TextField label="Chassis number (optional)" maxLength={120} name="chassisNumber" onChange={handleChange} value={formData.chassisNumber} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Mileage in km (optional)" min="0" name="mileage" onChange={handleChange} type="number" value={formData.mileage} />
                  <label className="inline-flex items-center gap-2 self-end pb-2 text-sm font-bold text-slate-700">
                    <input checked={formData.isPrimary} name="isPrimary" type="checkbox" onChange={handleChange} />
                    Set as primary vehicle
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Vehicle notes (optional)
                  <textarea
                    className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
                    maxLength={500}
                    name="vehicleNotes"
                    onChange={handleChange}
                    value={formData.vehicleNotes}
                  />
                </label>
              </div>
            )}
          </section>

          {error && <Message tone="error">{error}</Message>}
          {message && <Message tone="success">{message}</Message>}

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              <Send size={18} />
              {isSubmitting ? 'Creating and emailing...' : 'Create & email credentials'}
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={resetForm}
            >
              <X size={18} />
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-slate-500">Latest registration</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Created Customer</h2>

        {createdRecord ? (
          <div className="mt-6 grid gap-3">
            <SummaryRow label="Customer ID" value={createdRecord.id} />
            <SummaryRow label="Email" value={createdRecord.email} />
            <SummaryRow label="Status" value={createdRecord.accountSetupStatus === 'Complete' ? 'Profile complete' : 'Awaiting profile setup'} />
            {createdVehicle ? (
              <>
                <SummaryRow label="Vehicle number" value={createdVehicle.vehicleNumber} />
                <SummaryRow label="Vehicle" value={`${createdVehicle.make} ${createdVehicle.model}`} />
                <SummaryRow label="Primary vehicle" value={createdVehicle.isPrimary ? 'Yes' : 'No'} />
              </>
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                No vehicle was added during registration. Staff can add it later from the Customers & Vehicles page.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm font-semibold text-slate-600">
            The newest customer details will appear here after creation.
          </p>
        )}
      </section>
    </div>
  )
}

function toPayload(formData) {
  return {
    email: formData.email,
    password: formData.password,
  }
}

function toVehiclePayload(data) {
  return {
    vehicleNumber: data.vehicleNumber.trim(),
    make: data.make.trim(),
    model: data.model.trim(),
    year: data.year.trim(),
    color: data.color.trim(),
    fuelType: data.fuelType.trim(),
    imageUrl: '',
    engineNumber: data.engineNumber.trim(),
    chassisNumber: data.chassisNumber.trim(),
    mileage: data.mileage === '' ? null : Number.parseInt(data.mileage, 10),
    isPrimary: Boolean(data.isPrimary),
    notes: data.vehicleNotes.trim(),
  }
}

function TextField({ label, name, onChange, value, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        onChange={onChange}
        value={value}
        {...props}
      />
    </label>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </p>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || 'Not recorded'}</p>
    </div>
  )
}
