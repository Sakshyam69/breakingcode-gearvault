import { useState } from 'react'
import { Car, Send, UserPlus, X } from 'lucide-react'
import { createCustomerAccount } from '../../lib/auth'

const initialFormData = {
  fullName: '',
  email: '',
  phone: '',
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
  notes: '',
}

export function CustomerRegistration() {
  const [formData, setFormData] = useState(initialFormData)
  const [createdRecord, setCreatedRecord] = useState(null)
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

  function resetForm() {
    setFormData(initialFormData)
    setCreatedRecord(null)
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
      setCreatedRecord(response)
      setFormData(initialFormData)
      setMessage(response.credentialEmailSent
        ? 'Customer account, first vehicle, and credential email are ready.'
        : 'Customer account and first vehicle were created, but the credential email was not sent. Check Brevo settings.')
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
              Create customer login credentials and register their first vehicle.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <UserPlus size={22} />
          </span>
        </div>

        <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
          <section className="grid gap-4">
            <SectionTitle icon={UserPlus} title="Customer account" />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Full name" name="fullName" onChange={handleChange} required value={formData.fullName} />
              <TextField label="Phone" name="phone" onChange={handleChange} required type="tel" value={formData.phone} />
            </div>
            <TextField label="Email" name="email" onChange={handleChange} required type="email" value={formData.email} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Temporary password" minLength={8} name="password" onChange={handleChange} required type="password" value={formData.password} />
              <TextField label="Confirm password" minLength={8} name="confirmPassword" onChange={handleChange} required type="password" value={formData.confirmPassword} />
            </div>
          </section>

          <section className="grid gap-4">
            <SectionTitle icon={Car} title="First vehicle" />
            <TextField label="Vehicle number" name="vehicleNumber" onChange={handleChange} required value={formData.vehicleNumber} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Make" name="make" onChange={handleChange} required value={formData.make} />
              <TextField label="Model" name="model" onChange={handleChange} required value={formData.model} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="Year" name="year" onChange={handleChange} value={formData.year} />
              <TextField label="Color" name="color" onChange={handleChange} value={formData.color} />
              <TextField label="Fuel type" name="fuelType" onChange={handleChange} value={formData.fuelType} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="Mileage" min="0" name="mileage" onChange={handleChange} type="number" value={formData.mileage} />
              <TextField label="Engine number" name="engineNumber" onChange={handleChange} value={formData.engineNumber} />
              <TextField label="Chassis number" name="chassisNumber" onChange={handleChange} value={formData.chassisNumber} />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              <input
                checked={formData.isPrimary}
                className="h-4 w-4 accent-[var(--primary)]"
                name="isPrimary"
                onChange={handleChange}
                type="checkbox"
              />
              Mark as primary vehicle
            </label>
            <TextareaField label="Notes" name="notes" onChange={handleChange} value={formData.notes} />
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
              {isSubmitting ? 'Creating and emailing...' : 'Create customer & email credentials'}
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
            <SummaryRow label="Customer" value={createdRecord.customer?.fullName} />
            <SummaryRow label="Email" value={createdRecord.customer?.email} />
            <SummaryRow label="Phone" value={createdRecord.customer?.phone} />
            <SummaryRow label="Vehicle" value={createdRecord.vehicle?.vehicleNumber} />
            <SummaryRow label="Model" value={[createdRecord.vehicle?.make, createdRecord.vehicle?.model].filter(Boolean).join(' ')} />
            <SummaryRow label="Email status" value={createdRecord.credentialEmailSent ? 'Credentials emailed' : 'Email not sent'} />
          </div>
        ) : (
          <p className="mt-6 text-sm font-semibold text-slate-600">
            The newest customer and vehicle details will appear here after creation.
          </p>
        )}
      </section>
    </div>
  )
}

function toPayload(formData) {
  return {
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    password: formData.password,
    vehicle: {
      vehicleNumber: formData.vehicleNumber,
      make: formData.make,
      model: formData.model,
      year: formData.year,
      color: formData.color,
      fuelType: formData.fuelType,
      engineNumber: formData.engineNumber,
      chassisNumber: formData.chassisNumber,
      mileage: formData.mileage === '' ? null : Number(formData.mileage),
      isPrimary: formData.isPrimary,
      notes: formData.notes,
    },
  }
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
      <Icon className="text-[var(--primary)]" size={18} />
      <h3 className="text-sm font-black uppercase text-slate-700">{title}</h3>
    </div>
  )
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

function TextareaField({ label, name, onChange, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <textarea
        className="min-h-24 resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        onChange={onChange}
        value={value}
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
