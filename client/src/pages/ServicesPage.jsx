import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarCheck,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { servicesImage } from '../assets/assets'

const services = [
  {
    code: 'IN',
    icon: Boxes,
    title: 'Inventory Control',
    body: 'Track parts, stock status, vendor purchases, and low-stock alerts before counters run dry.',
  },
  {
    code: 'SA',
    icon: ReceiptText,
    title: 'Sales Invoicing',
    body: 'Create customer invoices, apply loyalty discounts, and keep credit balances visible for follow-up.',
  },
  {
    code: 'CU',
    icon: Users,
    title: 'Customer Records',
    body: 'Store customer profiles, vehicle details, service history, purchase history, and communication notes.',
  },
  {
    code: 'SE',
    icon: CalendarCheck,
    title: 'Service Bookings',
    body: 'Let customers request appointments, unavailable parts, and reviews through a guided self-service flow.',
  },
  {
    code: 'RE',
    icon: BarChart3,
    title: 'Reports and Insights',
    body: 'Review revenue, purchases, regular customers, top spenders, pending credit, and stock movement.',
  },
  {
    code: 'RO',
    icon: ShieldCheck,
    title: 'Role Workspaces',
    body: 'Give admins, staff, and customers focused screens that match their day-to-day responsibilities.',
  },
]

export function ServicesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="relative flex min-h-[520px] overflow-hidden md:h-[70vh] md:min-h-[560px] md:max-h-[680px]">
        <img
          alt="Automotive service background"
          className="absolute inset-0 h-full w-full object-cover opacity-95"
          src={servicesImage}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(7_11_18_/_0.82)] via-[rgb(7_11_18_/_0.52)] to-[rgb(7_11_18_/_0.08)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgb(7_11_18_/_0.08)] via-transparent to-[var(--bg-primary)]" />

        <div className="relative mx-auto flex w-full max-w-[1480px] items-center px-4 py-16 md:px-8 xl:px-10">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
              Services
            </span>

            <div className="mt-6">
              <h1 className="text-5xl font-extrabold leading-tight md:text-6xl">
                Operational tools for modern parts and{' '}
                <span className="text-[var(--primary)]">service teams.</span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-[var(--text-secondary)]">
                Autocare brings the key workflows of a vehicle parts business into one organized product experience.
              </p>

              <Link
                className="mt-8 inline-flex items-center gap-3 rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold shadow-lg shadow-red-500/20 transition hover:bg-[var(--primary-hover)]"
                to="/contact"
              >
                Talk to us
                <ArrowRight size={19} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] px-4 pb-20 md:px-8 xl:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon

            return (
              <article
                className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/90 p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-xl hover:shadow-red-500/10"
                key={service.title}
              >
                <div className="flex items-start gap-5">
                  <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-[var(--primary)]/20 bg-gradient-to-b from-[rgb(239_68_68_/_0.25)] to-[rgb(127_29_29_/_0.40)]">
                    <span className="text-sm font-bold text-red-400">{service.code}</span>
                    <Icon className="mt-3 text-[var(--text-primary)]" size={30} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold transition group-hover:text-red-400">
                      {service.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {service.body}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
