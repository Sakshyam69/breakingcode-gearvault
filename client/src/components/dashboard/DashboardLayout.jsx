import { useState } from 'react'
import { Bell, ChevronRight, Menu, User } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logo } from '../../assets/assets'
import { clearAuth, getStoredAuth } from '../../lib/auth'

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
  const auth = getStoredAuth()
  const userName = auth?.user?.fullName ?? auth?.user?.email ?? role

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
                className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/35 text-slate-200 transition hover:bg-white/10 hover:text-white"
                type="button"
                aria-label={`Profile: ${userName}`}
                title={userName}
              >
                <User size={18} />
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
          <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-slate-600">{subtitle}</p>
            </div>
          </section>

          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
