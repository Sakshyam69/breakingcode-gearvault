import { LogOut, User, UserPlus } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { logo } from '../../assets/assets'
import { clearAuth, getDashboardPath, getStoredAuth } from '../../lib/auth'
import { Button } from './Button'

const publicLinks = [
  ['/', 'Home'],
  ['/services', 'Services'],
  ['/about', 'About'],
  ['/contact', 'Contact us'],
]

export function Navbar() {
  const navigate = useNavigate()
  const auth = getStoredAuth()
  const links = auth?.user ? [] : publicLinks

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/40">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link className="flex items-center gap-3 text-left" to="/" aria-label="Autocare home">
          <img
            className="h-16 w-auto object-contain"
            src={logo}
            alt="Autocare logo"
          />
        </Link>

        {links.length > 0 && (
          <nav className="hidden items-center gap-8 overflow-x-auto text-white md:flex" aria-label="Primary navigation">
            {links.map(([path, label]) => (
              <NavLink
                className={({ isActive }) =>
                  `text-sm font-extrabold tracking-wide transition ${
                    isActive
                      ? 'text-red-500'
                      : 'text-white hover:text-red-400'
                  }`
                }
                end={path === '/'}
                key={path}
                to={path}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        {auth?.user ? (
          <div className="flex items-center gap-2">
            <Button
              as={Link}
              className="hidden gap-2 sm:flex"
              to={getDashboardPath(auth.user.role)}
              variant="lightOutline"
            >
              <User size={18} />
              {auth.user.role}
            </Button>
            <Button className="gap-2" type="button" variant="danger" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              as={Link}
              className="hidden gap-2 sm:flex"
              to="/login"
              variant="lightOutline"
            >
              <User size={18} />
              Login
            </Button>
            <Button as={Link} className="gap-2" to="/signup" variant="danger">
              <UserPlus size={18} />
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
