import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Image,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import {
  changePassword,
  getCurrentProfile,
  getCurrentUser,
  getStoredAuth,
  requestPasswordChangeCode,
  saveAuth,
  updateProfile,
  uploadProfileImage,
} from '../../lib/auth'

export function SettingsWorkspace({ reportRequests, role }) {
  const [activeMenu, setActiveMenu] = useState('profile')
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [profile, setProfile] = useState(auth?.user?.profile ?? null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const user = auth?.user

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        const currentUser = await getCurrentUser()
        let profileData = currentUser.profile

        try {
          profileData = await getCurrentProfile()
        } catch {
          profileData = currentUser.profile
        }

        const nextAuth = {
          ...getStoredAuth(),
          user: {
            ...currentUser,
            profile: profileData,
          },
        }

        saveAuth(nextAuth)

        if (isMounted) {
          setAuth(nextAuth)
          setProfile(profileData)
        }
      } catch (exception) {
        if (isMounted) {
          setError(exception.message)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const menuItems = [
    { id: 'profile', label: 'Profile Update', icon: User },
    { id: 'password', label: 'Change Password', icon: KeyRound },
    ...(role === 'Customer' ? [{ id: 'reports', label: 'Report Requests', icon: FileText }] : []),
  ]

  function handleSaved(nextAuth, successMessage) {
    if (nextAuth?.user) {
      setAuth(nextAuth)
      setProfile(nextAuth.user.profile ?? null)
    }

    setError('')
    setMessage(successMessage)
  }

  function handleError(errorMessage) {
    setMessage('')
    setError(errorMessage)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <nav className="grid gap-2" aria-label={`${role} settings menu`}>
          {menuItems.map(({ icon: Icon, id, label }) => {
            const isActive = activeMenu === id

            return (
              <button
                className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black transition ${
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                }`}
                key={id}
                type="button"
                onClick={() => setActiveMenu(id)}
              >
                <Icon size={18} />
                {label}
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="grid gap-6">
        {(message || error) && (
          <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {error || message}
          </p>
        )}

        {activeMenu === 'profile' && (
          <ProfilePanel
            profile={profile}
            role={role}
            user={user}
            onOpen={() => setIsProfileModalOpen(true)}
          />
        )}

        {activeMenu === 'password' && (
          <PasswordPanel user={user} onOpen={() => setIsPasswordModalOpen(true)} />
        )}

        {activeMenu === 'reports' && (
          <section className="grid gap-6">
            <HeaderCard icon={FileText} kicker="Customer" title="Report Requests" />
            {reportRequests}
          </section>
        )}
      </section>

      {isProfileModalOpen && (
        <ProfileUpdateModal
          profile={profile}
          user={user}
          onClose={() => setIsProfileModalOpen(false)}
          onError={handleError}
          onSaved={handleSaved}
        />
      )}

      {isPasswordModalOpen && (
        <PasswordChangeModal
          user={user}
          onClose={() => setIsPasswordModalOpen(false)}
          onError={handleError}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function ProfilePanel({ onOpen, profile, role, user }) {
  const profileCompletion = useMemo(() => {
    const fields = [
      user?.fullName,
      user?.phone,
      profile?.address,
      profile?.city,
      profile?.gender,
      profile?.emergencyContactPhone,
    ]
    const filledFields = fields.filter((value) => value?.trim()).length
    return Math.round((filledFields / fields.length) * 100)
  }, [profile, user])

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelTitle icon={User} kicker={role} title="Profile Update" />
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
          type="button"
          onClick={onOpen}
        >
          <User size={18} />
          Update profile
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Detail label="Name" value={user?.fullName} />
        <Detail label="Email" value={user?.email} />
        <Detail label="Phone" value={user?.phone} />
        <Detail label="Address" value={profile?.address} />
        <Detail label="City" value={profile?.city} />
        <Detail label="Contact Number" value={profile?.emergencyContactPhone} />
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-700">Profile completion</p>
          <p className="text-sm font-black text-[var(--primary)]">{profileCompletion}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${profileCompletion}%` }} />
        </div>
      </div>
    </section>
  )
}

function PasswordPanel({ onOpen, user }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelTitle icon={LockKeyhole} kicker="Security" title="Change Password" />
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
          type="button"
          onClick={onOpen}
        >
          <KeyRound size={18} />
          Change password
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Detail label="Account email" value={user?.email} />
        <Detail label="Verification" value="6-character email code" />
      </div>

      <p className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        Password changes require your current password and a short code sent to your account email.
      </p>
    </section>
  )
}

function ProfileUpdateModal({ onClose, onError, onSaved, profile, user }) {
  const [formData, setFormData] = useState(() => getProfileFormData(user, profile))
  const [modalError, setModalError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploadStatus('Uploading image...')
    setModalError('')

    try {
      const upload = await uploadProfileImage(file)
      setFormData((current) => ({
        ...current,
        profileImageUrl: upload.url,
      }))
      setUploadStatus('Image uploaded.')
    } catch (exception) {
      setUploadStatus('')
      setModalError(exception.message)
      onError(exception.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setModalError('')

    try {
      const nextAuth = await updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        profileImageUrl: formData.profileImageUrl,
        emergencyContactPhone: formData.emergencyContactPhone,
      })

      onSaved(nextAuth, 'Profile updated successfully.')
      onClose()
    } catch (exception) {
      setModalError(exception.message)
      onError(exception.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Update Profile" icon={User} onClose={onClose}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        {modalError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">
            {modalError}
          </p>
        )}
        <Field label="Full Name" name="fullName" required value={formData.fullName} onChange={handleChange} />
        <Field label="Phone" name="phone" required type="tel" value={formData.phone} onChange={handleChange} />
        <Field label="Address" name="address" required value={formData.address} onChange={handleChange} />
        <Field label="City" name="city" required value={formData.city} onChange={handleChange} />
        <Field label="Date of Birth" name="dateOfBirth" required={false} type="date" value={formData.dateOfBirth} onChange={handleChange} />
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Gender</span>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
            name="gender"
            required
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">Select gender</option>
            {['Female', 'Male', 'Other', 'Prefer not to say'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <Field
          className="sm:col-span-2"
          label="Contact Number"
          name="emergencyContactPhone"
          required
          type="tel"
          value={formData.emergencyContactPhone}
          onChange={handleChange}
        />
        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-slate-700">Profile Image</span>
          <span className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <Image className="text-slate-500" size={18} />
            <input
              accept="image/gif,image/jpeg,image/png,image/webp"
              className="min-w-0 flex-1 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-black file:text-white"
              type="file"
              onChange={handleImageChange}
            />
          </span>
          {uploadStatus && <span className="mt-2 block text-xs font-bold text-slate-500">{uploadStatus}</span>}
        </label>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
          disabled={isSaving}
          type="submit"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </Modal>
  )
}

function PasswordChangeModal({ onClose, onError, onSaved, user }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [modalError, setModalError] = useState('')
  const [codeMessage, setCodeMessage] = useState('')
  const [isRequestingCode, setIsRequestingCode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: name === 'code' ? value.toUpperCase() : value,
    }))
  }

  async function handleRequestCode() {
    setIsRequestingCode(true)
    setModalError('')
    setCodeMessage('')

    try {
      const response = await requestPasswordChangeCode()
      setCodeMessage(response.message ?? `Code sent to ${user?.email}.`)
    } catch (exception) {
      setModalError(exception.message)
      onError(exception.message)
    } finally {
      setIsRequestingCode(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      setModalError('New password and confirm password must match.')
      onError('New password and confirm password must match.')
      return
    }

    setIsSaving(true)
    setModalError('')

    try {
      const nextAuth = await changePassword({
        currentPassword: formData.currentPassword,
        code: formData.code,
        newPassword: formData.newPassword,
      })

      onSaved(nextAuth, 'Password changed successfully.')
      onClose()
    } catch (exception) {
      setModalError(exception.message)
      onError(exception.message)
    } finally {
      setIsSaving(false)
    }
  }

  const passwordType = showPasswords ? 'text' : 'password'

  return (
    <Modal title="Change Password" icon={LockKeyhole} onClose={onClose}>
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-black text-slate-950">{user?.email}</p>
        <p className="mt-1 text-xs font-semibold text-slate-600">A 6-character code will be sent to this email.</p>
        <button
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isRequestingCode}
          type="button"
          onClick={handleRequestCode}
        >
          <ShieldCheck size={16} />
          {isRequestingCode ? 'Sending...' : 'Send code'}
        </button>
        {codeMessage && <p className="mt-3 text-sm font-semibold text-emerald-700">{codeMessage}</p>}
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        {modalError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {modalError}
          </p>
        )}
        <PasswordField label="Current Password" name="currentPassword" type={passwordType} value={formData.currentPassword} onChange={handleChange} />
        <Field label="Email Code" maxLength={6} minLength={6} name="code" required value={formData.code} onChange={handleChange} />
        <PasswordField label="New Password" minLength={8} name="newPassword" type={passwordType} value={formData.newPassword} onChange={handleChange} />
        <PasswordField label="Confirm Password" minLength={8} name="confirmPassword" type={passwordType} value={formData.confirmPassword} onChange={handleChange} />

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={() => setShowPasswords((current) => !current)}
        >
          {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
          {showPasswords ? 'Hide passwords' : 'Show passwords'}
        </button>

        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          <CheckCircle2 size={18} />
          {isSaving ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </Modal>
  )
}

function HeaderCard({ icon: Icon, kicker, title }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelTitle icon={Icon} kicker={kicker} title={title} />
    </section>
  )
}

function PanelTitle({ icon: Icon, kicker, title }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
        <Icon size={22} />
      </span>
      <div>
        <p className="text-xs font-black uppercase text-[var(--primary)]">{kicker}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
    </div>
  )
}

function Modal({ children, icon: Icon, onClose, title }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close modal" onClick={onClose} />
      <section className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 text-slate-950 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <PanelTitle icon={Icon} kicker="Settings" title={title} />
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function Field({
  className = '',
  label,
  maxLength,
  minLength,
  name,
  onChange,
  required = true,
  type = 'text',
  value,
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function PasswordField(props) {
  return <Field {...props} required type={props.type ?? 'password'} />
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value || 'Not set'}</p>
    </div>
  )
}

function getProfileFormData(user, profile) {
  return {
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    dateOfBirth: toDateInputValue(profile?.dateOfBirth),
    gender: profile?.gender ?? '',
    profileImageUrl: profile?.profileImageUrl ?? '',
    emergencyContactPhone: profile?.emergencyContactPhone ?? '',
  }
}

function toDateInputValue(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}
