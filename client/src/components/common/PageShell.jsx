import { useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function PageShell({ children }) {
  const location = useLocation()
  const dashboardPaths = ['/admin', '/staff', '/customer']
  const isDashboardPage = dashboardPaths.some((path) => (
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  ))
  const shouldOffsetFixedNavbar = location.pathname !== '/' && !isDashboardPage

  if (isDashboardPage) {
    return children
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <div className={shouldOffsetFixedNavbar ? 'pt-[88px]' : ''}>{children}</div>
      <Footer />
    </div>
  )
}
