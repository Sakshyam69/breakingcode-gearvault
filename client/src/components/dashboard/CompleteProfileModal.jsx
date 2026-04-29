import { useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Eye,
  Image,
  Lock,
  LogOut,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authImage } from '../../assets/assets'
import { clearAuth, completeAccountSetup, uploadProfileImage } from '../../lib/auth'

const genderOptions = ['Female', 'Male', 'Other', 'Prefer not to say']

export function CompleteProfileModal({ onComplete, user }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    address: '',
    city: '',
    dateOfBirth: '',
    gender: '',
    profileImageUrl: '',
    emergencyContactPhone: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [imageUploadStatus, setImageUploadStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  async function handleProfileImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError('')
    setImageUploadStatus('Uploading image...')

    try {
      const upload = await uploadProfileImage(file)
      setFormData((current) => ({
        ...current,
        profileImageUrl: upload.url,
      }))
      setImageUploadStatus('Image uploaded.')
    } catch (exception) {
      setImageUploadStatus('')
      setError(exception.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirm password must match.')
      return
    }

    setIsSubmitting(true)

    try {
      await completeAccountSetup({
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender,
        profileImageUrl: formData.profileImageUrl,
        emergencyContactPhone: formData.emergencyContactPhone,
        newPassword: formData.newPassword,
      })

      onComplete()
    } catch (exception) {
      setError(exception.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 px-4 py-6 backdrop-blur-[2px] md:px-6"
      role="dialog"
    >
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-primary)] shadow-2xl lg:grid-cols-[0.85fr_1.15fr]">
          <section className="relative hidden min-h-full lg:block">
            <img className="h-full w-full object-cover" src={authImage} alt="Garage workspace" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 flex items-end p-10">
              <div>
                <p className="text-sm font-black uppercase text-[var(--primary)]">Autocare</p>
                <h2 className="mt-2 text-4xl font-black leading-tight text-white">
                  Complete your profile
                </h2>
                <p className="mt-4 max-w-md text-sm font-medium text-gray-200">
                  Signed in as {user?.email ?? 'your account'}.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-[var(--bg-secondary)] p-6 text-[var(--text-primary)] md:p-10">
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-[var(--primary)]">{user?.role ?? 'User'} setup</p>
                <h1 className="mt-1 text-3xl font-black">Profile details</h1>
              </div>
              <button
                className="flex min-h-10 items-center gap-2 rounded-lg border border-red-500/35 px-4 text-sm font-black text-red-200 transition hover:bg-red-500/10 hover:text-white"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>

            <form className="grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
              <ProfileField
                className="md:col-span-2"
                icon={UserRound}
                label="Full Name"
                name="fullName"
                onChange={handleChange}
                placeholder="Your full name"
                required
                value={formData.fullName}
              />
              <ProfileField
                icon={Phone}
                label="Phone Number"
                name="phone"
                onChange={handleChange}
                placeholder="Primary phone number"
                required
                type="tel"
                value={formData.phone}
              />
              <ProfileField
                icon={MapPin}
                label="Address"
                name="address"
                onChange={handleChange}
                placeholder="Street address"
                required
                value={formData.address}
              />
              <ProfileField
                icon={MapPin}
                label="City"
                name="city"
                onChange={handleChange}
                placeholder="City"
                required
                value={formData.city}
              />
              <ProfileField
                icon={Calendar}
                label="Date of Birth"
                name="dateOfBirth"
                onChange={handleChange}
                required
                type="date"
                value={formData.dateOfBirth}
              />

              <label className="block">
                <span className="text-sm font-medium">Gender</span>
                <span className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                  <UserRound className="text-[var(--text-secondary)]" size={18} />
                  <select
                    className="w-full bg-transparent text-sm outline-none"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium">Profile Image</span>
                <span className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                  <Image className="text-[var(--text-secondary)]" size={18} />
                  <input
                    accept="image/gif,image/jpeg,image/png,image/webp"
                    className="min-w-0 flex-1 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--primary)] file:px-3 file:py-2 file:text-sm file:font-black file:text-white"
                    name="profileImage"
                    type="file"
                    onChange={handleProfileImageChange}
                  />
                  {formData.profileImageUrl && (
                    <a
                      className="text-sm font-bold text-[var(--primary)]"
                      href={formData.profileImageUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View
                    </a>
                  )}
                </span>
                {imageUploadStatus && (
                  <span className="mt-2 block text-xs font-bold text-[var(--text-secondary)]">
                    {imageUploadStatus}
                  </span>
                )}
              </label>
              <ProfileField
                className="md:col-span-2"
                icon={Phone}
                label="Emergency Contact Phone"
                name="emergencyContactPhone"
                onChange={handleChange}
                placeholder="Contact number"
                required
                type="tel"
                value={formData.emergencyContactPhone}
              />
              <ProfileField
                icon={Lock}
                label="New Password"
                name="newPassword"
                onChange={handleChange}
                placeholder="Set new password"
                required
                type="password"
                value={formData.newPassword}
              />
              <ProfileField
                icon={Lock}
                label="Confirm Password"
                name="confirmPassword"
                onChange={handleChange}
                placeholder="Confirm new password"
                required
                type="password"
                value={formData.confirmPassword}
              />

              {error && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 md:col-span-2">
                  {error}
                </p>
              )}

              <button
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
                disabled={isSubmitting}
                type="submit"
              >
                <CheckCircle2 size={18} />
                {isSubmitting ? 'Saving profile...' : 'Complete Setup'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

function ProfileField({
  className = '',
  icon: Icon,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  value,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <Icon className="text-[var(--text-secondary)]" size={18} />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          type={inputType}
          value={value}
        />
        {isPassword && (
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
          >
            <Eye size={18} />
          </button>
        )}
      </span>
    </label>
  )
}
