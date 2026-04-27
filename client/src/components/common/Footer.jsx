import { useEffect, useRef, useState } from 'react'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { logo } from '../../assets/assets'

const quickLinks = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/services', 'Services'],
  ['/contact', 'Contact us'],
  ['/login', 'Login'],
  ['/signup', 'Sign up'],
]

const legalLinks = [
  ['/terms', 'Terms and conditions'],
  ['/privacy', 'Privacy policy'],
]

const contactInfo = [
  [Mail, 'support@autocare.local'],
  [Phone, '+977 980-0000000'],
  [MapPin, 'Kathmandu, Nepal'],
]

const socialLinks = [
  ['https://facebook.com', 'Facebook', Facebook],
  ['https://instagram.com', 'Instagram', Instagram],
  ['https://linkedin.com', 'LinkedIn', Linkedin],
]

export function Footer() {
  const footerContentRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      {
        threshold: 0.2,
      }
    )

    if (footerContentRef.current) {
      observer.observe(footerContentRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <footer className="border-t border-white/10 bg-[#070b12] text-white">
      <div
        ref={footerContentRef}
        className={`mx-auto max-w-[1480px] px-4 py-12 transition-all duration-700 ease-out md:px-8 xl:px-10 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <section className="md:col-span-1">
            <img
              className="h-16 w-auto object-contain"
              src={logo}
              alt="Autocare logo"
            />

            <p className="mt-2 font-medium text-red-400">
              Vehicle parts operations platform
            </p>

            <p className="mt-4 leading-relaxed text-gray-400">
              Manage parts inventory, invoices, customers, bookings, service history,
              and reports from one organized workspace.
            </p>

            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map(([href, label, Icon]) => (
                <a
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-red-500"
                  href={href}
                  key={label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </section>

          <FooterColumn title="Quick links" links={quickLinks} />
          <ContactColumn />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-gray-500 md:flex-row">
          <p>© 2026 Autocare. All rights reserved.</p>
          <p>Built for vehicle service and parts teams.</p>
        </div>
      </div>
    </footer>
  )
}

function ContactColumn() {
  return (
    <section aria-label="Contact info">
      <h3 className="mb-4 text-lg font-semibold">Contact info</h3>
      <ul className="space-y-4 text-gray-400">
        {contactInfo.map(([Icon, label]) => (
          <li className="flex items-center gap-3" key={label}>
            <Icon className="text-red-500" size={18} />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <ul className="space-y-3 text-gray-400">
        {links.map(([path, label]) => (
          <li key={path}>
            <Link className="transition hover:text-red-400" to={path}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
