import { useEffect, useState } from 'react'
import { BadgeCheck, Ban, Mail, Save, Send, Shield, UserCog, UserPlus } from 'lucide-react'
import { createStaffAccount, getUsers, setUserActive, updateUserRole } from '../../lib/auth'

const initialFormData = {
  email: '',
  password: '',
  confirmPassword: '',
}

export function StaffManagement() {
  const [formData, setFormData] = useState(initialFormData)
  const [staffMembers, setStaffMembers] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyUserId, setBusyUserId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadStaffMembers() {
      try {
        const users = await getUsers()
        if (isMounted) {
          setStaffMembers(users.filter((user) => user.role === 'Staff'))
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

    loadStaffMembers()

    return () => {
      isMounted = false
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
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
      const auth = await createStaffAccount({
        email: formData.email,
        password: formData.password,
      })

      setStaffMembers((current) => [auth.user, ...current])
      if (auth.credentialEmailSent) {
        setFormData(initialFormData)
        setMessage('Staff account created and credentials emailed to the staff member.')
      } else {
        setMessage('Staff account created, but the credential email was not sent. Check Brevo settings before creating the next staff account.')
      }
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRoleChange(staff, nextRole) {
    setError('')
    setMessage('')
    setBusyUserId(staff.id)
    try {
      const updated = await updateUserRole(staff.id, nextRole)
      setStaffMembers((current) => {
        if (updated.role !== 'Staff') {
          return current.filter((item) => item.id !== updated.id)
        }
        return current.map((item) => (item.id === updated.id ? updated : item))
      })
      setMessage(`Role updated for ${updated.email}.`)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setBusyUserId(null)
    }
  }

  async function toggleActive(staff) {
    setError('')
    setMessage('')
    setBusyUserId(staff.id)
    try {
      const isActive = staff.isActive !== false
      const updated = await setUserActive(staff.id, !isActive)
      setStaffMembers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setMessage(`${updated.isActive ? 'Activated' : 'Deactivated'} ${updated.email}.`)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-600">Admin</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Staff Management</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Create staff login credentials and email them automatically.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <UserPlus size={22} />
          </span>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Staff email
            <input
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              name="email"
              onChange={handleChange}
              placeholder="staff@example.com"
              required
              type="email"
              value={formData.email}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Temporary password
            <input
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              minLength={8}
              name="password"
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              required
              type="password"
              value={formData.password}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Confirm password
            <input
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              minLength={8}
              name="confirmPassword"
              onChange={handleChange}
              placeholder="Repeat temporary password"
              required
              type="password"
              value={formData.confirmPassword}
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              <Send size={18} />
              {isSubmitting ? 'Creating and emailing...' : 'Create & email credentials'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Staff accounts</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Created staff</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <Mail size={22} />
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Active</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Profile</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-5 text-sm font-semibold text-slate-600" colSpan={7}>
                    Loading staff accounts...
                  </td>
                </tr>
              ) : staffMembers.length > 0 ? (
                staffMembers.map((staff) => (
                  <tr className="border-b border-slate-100 last:border-0" key={staff.id ?? staff.email}>
                    <td className="py-4 pr-4 text-sm font-black text-slate-950">{getDisplayName(staff)}</td>
                    <td className="py-4 pr-4 text-sm font-semibold text-slate-600">{staff.email}</td>
                    <td className="py-4 pr-4">
                      <ActiveBadge value={staff.isActive} />
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {staff.role === 'Admin' ? <Shield size={14} /> : <UserCog size={14} />}
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClassName(staff.accountSetupStatus)}`}>
                        {getStatusLabel(staff.accountSetupStatus)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={busyUserId === staff.id}
                          type="button"
                          onClick={() => toggleActive(staff)}
                          title={(staff.isActive !== false) ? 'Deactivate account' : 'Activate account'}
                        >
                          {(staff.isActive !== false) ? <Ban size={14} /> : <BadgeCheck size={14} />}
                          {(staff.isActive !== false) ? 'Deactivate' : 'Activate'}
                        </button>

                        <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700">
                          <Save size={14} />
                          <select
                            className="bg-transparent text-xs font-black text-slate-700 outline-none"
                            disabled={busyUserId === staff.id}
                            value={staff.role}
                            onChange={(event) => handleRoleChange(staff, event.target.value)}
                            title="Change role"
                          >
                            <option value="Staff">Staff</option>
                            <option value="Admin">Admin</option>
                            <option value="Customer">Customer</option>
                          </select>
                        </label>

                        <button
                          className="inline-flex min-h-9 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-400"
                          disabled
                          type="button"
                          title="Credentials are emailed when the staff account is created."
                        >
                          <Send size={14} />
                          Email on create
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-5 text-sm font-semibold text-slate-600" colSpan={7}>
                    No staff accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function getDisplayName(staff) {
  const fullName = staff.fullName?.trim()
  if (!fullName || fullName === getEmailPrefix(staff.email)) {
    return ''
  }

  return fullName
}

function getEmailPrefix(email = '') {
  return email.split('@', 1)[0]
}

function getStatusLabel(status) {
  return status === 'Complete' ? 'Profile complete' : 'Awaiting profile update'
}

function getStatusClassName(status) {
  return status === 'Complete'
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-amber-50 text-amber-700'
}

function ActiveBadge({ value }) {
  const isActive = value !== false
  const className = isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {isActive ? <BadgeCheck size={14} /> : <Ban size={14} />}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}
