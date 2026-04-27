import { useState } from 'react'
import { Eye, Lock, Mail, Phone, User, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authImage } from '../assets/assets'
import { useAuthPageTransition } from '../hooks/useAuthPageTransition'

export function SignupPage() {
  const navigate = useNavigate()
  const { mediaRef, navigateWithAuthTransition, pageRef } = useAuthPageTransition('signup')

  return (
    <main className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[var(--bg-primary)] px-6 py-10 text-[var(--text-primary)] [perspective:1400px]">
      <div
        className="grid w-full max-w-7xl grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 shadow-2xl [transform-style:preserve-3d] lg:grid-cols-2"
        ref={pageRef}
      >
        <div className="rounded-xl bg-[var(--bg-secondary)] p-8 md:p-12">
          <h1 className="mb-3 text-4xl font-bold">
            Create your <span className="text-[var(--primary)]">account</span>
          </h1>

          <p className="mb-8 text-[var(--text-secondary)]">
            Join Autocare and simplify your parts and service management.
          </p>

          <form
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              navigate('/login')
            }}
          >
            <AuthField icon={User} label="Full Name" placeholder="Enter your full name" />
            <AuthField
              icon={Mail}
              label="Email Address"
              placeholder="Enter your email"
              type="email"
            />
            <AuthField icon={Phone} label="Phone Number" placeholder="Enter phone number" />

            <label className="block">
              <span className="text-sm font-medium">Role</span>
              <select
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)] outline-none"
                defaultValue=""
              >
                <option value="" disabled>Select your role</option>
                <option>Customer</option>
                <option>Staff</option>
              </select>
            </label>

            <AuthField
              icon={Lock}
              label="Password"
              placeholder="Create password"
              type="password"
              trailingIcon={Eye}
            />
            <AuthField
              icon={Lock}
              label="Confirm Password"
              placeholder="Confirm password"
              type="password"
              trailingIcon={Eye}
            />

            <label className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)] md:col-span-2">
              <input type="checkbox" className="accent-[var(--primary)]" required />
              I agree to the
              <Link className="text-[var(--primary)]" to="/terms">Terms and Conditions</Link>
              and
              <Link className="text-[var(--primary)]" to="/privacy">Privacy Policy</Link>
            </label>

            <button
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-semibold transition hover:bg-[var(--primary-hover)] md:col-span-2"
              type="submit"
            >
              <UserPlus size={18} />
              Create Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link
              className="font-semibold text-[var(--primary)]"
              to="/login"
              onClick={(event) => navigateWithAuthTransition(event, '/login', 'login')}
            >
              Login
            </Link>
          </p>
        </div>

        <div className="relative hidden lg:block">
          <img className="h-full w-full object-cover" src={authImage} alt="Garage workspace" ref={mediaRef} />
          <div className="absolute inset-0 bg-black/50" />

          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div>
              <h2 className="text-4xl font-bold leading-tight">
                Smart management <br />
                for your <span className="text-[var(--primary)]">garage</span>
              </h2>

              <div className="mb-6 mt-6 h-1 w-14 bg-[var(--primary)]" />

              <ul className="space-y-4 text-gray-200">
                <li>Manage inventory in real-time</li>
                <li>Track services and bookings</li>
                <li>Generate invoices instantly</li>
                <li>Get AI-powered insights</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function AuthField({ icon: Icon, label, placeholder, type = 'text', trailingIcon: TrailingIcon }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <Icon className="text-[var(--text-secondary)]" size={18} />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
          placeholder={placeholder}
          type={inputType}
        />
        {TrailingIcon && (
          <button
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
          >
            <TrailingIcon size={18} />
          </button>
        )}
      </span>
    </label>
  )
}
