import { useLocation } from 'react-router-dom'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function PageShell({ children }) {
  const location = useLocation()
  const shouldOffsetFixedNavbar = location.pathname !== '/'

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <div className={shouldOffsetFixedNavbar ? 'pt-[88px]' : ''}>{children}</div>
      <Footer />
    </div>
  )
}
