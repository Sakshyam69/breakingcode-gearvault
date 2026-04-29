import { useEffect, useState } from 'react'
import { Bell, ChevronRight, Edit3, Image, Menu, Save, User, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logo } from '../../assets/assets'
import {
  clearAuth,
  getCurrentProfile,
  getCurrentUser,
  getStoredAuth,
  isAccountSetupPending,
  updateProfile,
  uploadProfileImage,
} from '../../lib/auth'
import { CompleteProfileModal } from './CompleteProfileModal'

export function DashboardLayout({
  children,
  navItems,
  role,
  subtitle,
  title,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileSetupComplete, setIsProfileSetupComplete] = useState(false)
  const [auth, setAuth] = useState(() => getStoredAuth())
  const userName = auth?.user?.fullName ?? auth?.user?.email ?? role
  const profileImageUrl = auth?.user?.profile?.profileImageUrl
  const shouldShowProfileSetup = isAccountSetupPending(auth?.user) && !isProfileSetupComplete

  useEffect(() => {
    let isMounted = true

    async function refreshUser() {
      if (!auth?.token) {
        return
      }

      try {
        const user = await getCurrentUser()
        let profile = user.profile

        try {
          profile = await getCurrentProfile()
        } catch {
          profile = user.profile
        }

        const userWithProfile = {
          ...user,
          profile,
        }

        if (isMounted) {
          setAuth((current) => ({
            ...current,
            user: userWithProfile,
          }))
        }
      } catch {
        if (isMounted) {
          setAuth(getStoredAuth())
        }
      }
    }

    refreshUser()

    return () => {
      isMounted = false
    }
  }, [auth?.token])

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  function isActiveRoute(path) {
    if (path === '/admin' || path === '/staff' || path === '/customer') {
      return location.pathname === path
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <aside
        className="group/sidebar fixed inset-y-0 left-0 z-40 hidden w-20 overflow-hidden border-r border-red-500/25 bg-black px-3 py-5 text-white transition-all duration-300 ease-out hover:w-72 lg:flex lg:flex-col"
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className="flex items-center gap-3 px-2">
          <img className="h-14 w-auto object-contain" src={logo} alt="Autocare logo" />
          <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
            <p className="text-xs font-black uppercase text-red-400">Autocare</p>
            <p className="whitespace-nowrap font-black">{role} dashboard</p>
          </div>
        </div>

        <nav className="mt-8 grid gap-1" aria-label={`${role} sidebar navigation`}>
          {navItems.map(({ icon: Icon, label, to }) => {
            const isActive = isActiveRoute(to)

            return (
              <Link
                className={`flex items-center gap-3 overflow-hidden rounded-lg px-3 py-3 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={label}
                to={to}
              >
                <Icon className="shrink-0 transition-transform duration-200 group-hover/sidebar:scale-110" size={18} />
                <span className="min-w-40 translate-x-2 whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100">
                  {label}
                </span>
                <ChevronRight className="ml-auto shrink-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100" size={16} />
              </Link>
            )
          })}
        </nav>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            type="button"
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[86vw] flex-col border-r border-red-500/25 bg-black px-4 py-5 text-white shadow-2xl">
            <div className="flex items-center gap-3 px-2">
              <img className="h-14 w-auto object-contain" src={logo} alt="Autocare logo" />
              <div>
                <p className="text-xs font-black uppercase text-red-400">Autocare</p>
                <p className="font-black">{role} dashboard</p>
              </div>
            </div>

            <nav className="mt-8 grid gap-1" aria-label={`${role} mobile sidebar`}>
              {navItems.map(({ icon: Icon, label, to }) => {
                const isActive = isActiveRoute(to)

                return (
                  <Link
                    className={`flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold transition ${
                      isActive
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    key={label}
                    to={to}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      {label}
                    </span>
                    <ChevronRight size={16} />
                  </Link>
                )
              })}
            </nav>

          </aside>
        </div>
      )}

      <div className={`transition-[padding-left] duration-300 ease-out ${isSidebarExpanded ? 'lg:pl-72' : 'lg:pl-20'}`}>
        <header className="sticky top-0 z-30 border-b border-red-500/25 bg-black px-4 py-4 text-white shadow-sm md:px-6">
          <div className="relative flex min-h-11 items-center justify-between gap-4">
            <div className="flex items-center">
              <button
                className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/35 text-slate-200 lg:hidden"
                type="button"
                aria-label={`${role} menu`}
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 w-[calc(100%-8rem)] -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-xs font-black uppercase text-red-400">{role}</p>
              <h1 className="truncate text-xl font-black md:text-2xl">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/35 text-slate-200 transition hover:bg-white/10 hover:text-white"
                type="button"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              <button
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-red-500/35 text-slate-200 transition hover:bg-white/10 hover:text-white"
                type="button"
                aria-label={`Profile: ${userName}`}
                title={userName}
                onClick={() => setIsProfileOpen(true)}
              >
                {profileImageUrl ? (
                  <img className="h-full w-full object-cover" src={profileImageUrl} alt="" />
                ) : (
                  <span className="grid h-full w-full place-items-center">
                    <User className="block" size={20} strokeWidth={2.25} />
                  </span>
                )}
              </button>
              <button
                className="min-h-10 rounded-lg bg-[var(--primary)] px-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] sm:px-4"
                type="button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden" aria-label={`${role} mobile navigation`}>
            {navItems.map(({ icon: Icon, label, to }) => {
              const isActive = isActiveRoute(to)

              return (
                <Link
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold ${
                    isActive
                      ? 'bg-[var(--primary)] text-white'
                      : 'border border-red-500/35 text-slate-200'
                  }`}
                  key={label}
                  to={to}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </header>

        <main className="min-h-[calc(100vh-76px)] bg-white px-4 py-6 text-slate-950 md:px-6 lg:px-8">
          {subtitle && (
            <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="max-w-3xl">
                <p className="text-sm font-bold text-slate-600">{subtitle}</p>
              </div>
            </section>
          )}

          <div className="mt-6">{children}</div>
        </main>
      </div>

      {shouldShowProfileSetup && (
        <CompleteProfileModal
          user={auth.user}
          onComplete={() => {
            setAuth(getStoredAuth())
            setIsProfileSetupComplete(true)
          }}
        />
      )}

      {isProfileOpen && (
        <ProfileDetailsModal
          user={auth?.user}
          onUpdated={() => setAuth(getStoredAuth())}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </div>
  )
}

function ProfileDetailsModal({ onClose, onUpdated, user }) {
  const profile = user?.profile
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(() => ({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    dateOfBirth: toDateInputValue(profile?.dateOfBirth),
    gender: profile?.gender ?? '',
    profileImageUrl: profile?.profileImageUrl ?? '',
    emergencyContactPhone: profile?.emergencyContactPhone ?? '',
  }))
  const displayName = user?.fullName || user?.email || 'User'
  const details = [
    ['User ID', user?.id],
    ['Email', user?.email],
    ['Phone', user?.phone],
    ['Role', user?.role],
    ['Address', profile?.address],
    ['City', profile?.city],
    ['Date of Birth', formatDate(profile?.dateOfBirth)],
    ['Gender', profile?.gender],
    ['Contact Number', profile?.emergencyContactPhone],
  ].filter(([, value]) => value)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setUploadStatus('Uploading image...')

    try {
      const upload = await uploadProfileImage(file)
      setFormData((current) => ({
        ...current,
        profileImageUrl: upload.url,
      }))
      setUploadStatus('Image uploaded.')
    } catch (exception) {
      setUploadStatus('')
      setError(exception.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      await updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        profileImageUrl: formData.profileImageUrl,
        emergencyContactPhone: formData.emergencyContactPhone,
      })

      onUpdated()
      setIsEditing(false)
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close profile" onClick={onClose} />
      <section className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 overflow-hidden rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200 place-items-center">
              {(isEditing ? formData.profileImageUrl : profile?.profileImageUrl) ? (
                <img className="h-full w-full object-cover" src={isEditing ? formData.profileImageUrl : profile.profileImageUrl} alt="" />
              ) : (
                <span className="grid h-full w-full place-items-center">
                  <User className="block" size={28} strokeWidth={2.25} />
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase text-[var(--primary)]">{user?.role ?? 'Profile'}</p>
              <h2 className="mt-1 text-2xl font-black">{displayName}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              type="button"
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? <X size={16} /> : <Edit3 size={16} />}
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {isEditing ? (
          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <ProfileEditField label="Full Name" name="fullName" required value={formData.fullName} onChange={handleChange} />
            <ProfileEditField label="Phone" name="phone" required type="tel" value={formData.phone} onChange={handleChange} />
            <ProfileEditField label="Address" name="address" required value={formData.address} onChange={handleChange} />
            <ProfileEditField label="City" name="city" required value={formData.city} onChange={handleChange} />
            <ProfileEditField label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Gender</span>
              <select
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[var(--primary)]"
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
            <ProfileEditField
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
                  className="min-w-0 flex-1 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-black file:text-white"
                  type="file"
                  onChange={handleImageChange}
                />
              </span>
              {uploadStatus && <span className="mt-2 block text-xs font-bold text-slate-500">{uploadStatus}</span>}
            </label>
            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">
                {error}
              </p>
            )}
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-70 sm:col-span-2"
              disabled={isSaving}
              type="submit"
            >
              <Save size={17} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div className="rounded-lg border border-slate-200 p-3" key={label}>
                  <p className="text-xs font-black uppercase text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            {!profile && (
              <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Profile details are not completed yet.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function ProfileEditField({
  className = '',
  label,
  name,
  onChange,
  required = false,
  type = 'text',
  value,
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[var(--primary)]"
        name={name}
        required={required}
        type={type}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function toDateInputValue(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
