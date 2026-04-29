import { useState } from 'react'
import { Send, UserPlus, X } from 'lucide-react'
import { createCustomerAccount } from '../../lib/auth'

const initialFormData = {
  email: '',
  password: '',
  confirmPassword: '',
}

export function CustomerRegistration() {
  const [formData, setFormData] = useState(initialFormData)
  const [createdRecord, setCreatedRecord] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
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
      setCreatedRecord(response.customer)
      setFormData(initialFormData)
      setMessage(response.credentialEmailSent
        ? 'Customer account created and credentials emailed.'
        : 'Customer account created, but the credential email was not sent. Check Brevo settings.')
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
              Create customer login credentials. Vehicle details can be added after the account is created.
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
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Add vehicle details from the Customers page after selecting this customer.
            </p>
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
