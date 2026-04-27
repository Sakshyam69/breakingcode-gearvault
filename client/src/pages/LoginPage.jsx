import { useState } from 'react'
import { Eye, Lock, LogIn, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authImage } from '../assets/assets'
import { useAuthPageTransition } from '../hooks/useAuthPageTransition'

export function LoginPage() {
  const navigate = useNavigate()
  const { mediaRef, navigateWithAuthTransition, pageRef } = useAuthPageTransition('login')

  return (
    <main className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[var(--bg-primary)] px-6 py-10 text-[var(--text-primary)] [perspective:1400px]">
      <div
        className="grid w-full max-w-7xl grid-cols-1 gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 shadow-2xl [transform-style:preserve-3d] lg:grid-cols-2"
        ref={pageRef}
      >
        <div className="relative hidden lg:block">
          <img className="h-full w-full object-cover" src={authImage} alt="Garage workspace" ref={mediaRef} />
          <div className="absolute inset-0 bg-black/55" />

          <div className="absolute inset-0 flex items-center p-12">
            <div>
              <h2 className="text-4xl font-bold leading-tight">
                All-in-one platform <br />
                for <span className="text-[var(--primary)]">parts & service</span>
              </h2>

              <div className="mb-6 mt-6 h-1 w-14 bg-[var(--primary)]" />

              <ul className="space-y-4 text-gray-200">
                <li>Centralized parts inventory</li>
                <li>Customer and service history</li>
                <li>Booking and invoicing system</li>
                <li>Detailed reports and analytics</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-[var(--bg-secondary)] p-8 md:p-12">
          <h1 className="mb-3 text-4xl font-bold">
            <span className="text-[var(--primary)]">Welcome</span> back!
          </h1>

          <p className="mb-8 text-[var(--text-secondary)]">
            Login to access your Autocare dashboard.
          </p>

          <form className="space-y-5">
            <AuthField
              icon={Mail}
              label="Email Address"
              placeholder="Enter your email"
              type="email"
            />
            <AuthField
              icon={Lock}
              label="Password"
              placeholder="Enter your password"
              type="password"
              trailingIcon={Eye}
            />

            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-[var(--primary)]" />
                Remember me
              </label>

              <button className="text-[var(--primary)]" type="button">
                Forgot password?
              </button>
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-semibold transition hover:bg-[var(--primary-hover)]"
              type="button"
              onClick={() => navigate('/admin')}
            >
              <LogIn size={18} />
              Login
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Don&apos;t have an account?{' '}
            <Link
              className="font-semibold text-[var(--primary)]"
              to="/signup"
              onClick={(event) => navigateWithAuthTransition(event, '/signup', 'signup')}
            >
              Register
            </Link>
          </p>
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
