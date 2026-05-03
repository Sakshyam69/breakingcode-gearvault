import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  Car,
  Clock,
  FileText,
  History,
  PackageSearch,
  Plus,
  ReceiptText,
  Wrench,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getMyBookingInvoices,
  getMyPartRequests,
  getMySalesInvoices,
  getMyServiceAppointments,
  getMyVehicles,
} from '../../lib/auth'

export function DashboardCustomer() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [appointments, setAppointments] = useState([])
  const [partRequests, setPartRequests] = useState([])
  const [salesInvoices, setSalesInvoices] = useState([])
  const [bookingInvoices, setBookingInvoices] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const [
          vehicleData,
          appointmentData,
          partRequestData,
          salesInvoiceData,
          bookingInvoiceData,
        ] = await Promise.all([
          getMyVehicles(),
          getMyServiceAppointments(),
          getMyPartRequests(),
          getMySalesInvoices(),
          getMyBookingInvoices(),
        ])

        if (isMounted) {
          setVehicles(vehicleData)
          setAppointments(appointmentData)
          setPartRequests(partRequestData)
          setSalesInvoices(salesInvoiceData)
          setBookingInvoices(bookingInvoiceData)
        }
      } catch (exception) {
        if (isMounted) {
          setError(exception.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const dashboard = useMemo(() => {
    const activeBookings = appointments.filter((appointment) => (
      ['Pending', 'Confirmed', 'InProgress'].includes(appointment.status)
    ))
    const pendingPartRequests = partRequests.filter((request) => (
      ['Pending', 'InReview', 'Available'].includes(request.status)
    ))
    const allInvoices = [
      ...salesInvoices.map((invoice) => ({ ...invoice, kind: 'Sales', date: invoice.invoiceDate ?? invoice.createdAt })),
      ...bookingInvoices.map((invoice) => ({ ...invoice, kind: 'Service', date: invoice.invoiceDate ?? invoice.createdAt })),
    ]
    const recentInvoices = [...allInvoices]
      .sort((left, right) => new Date(right.date ?? 0) - new Date(left.date ?? 0))
      .slice(0, 4)
    const upcomingBooking = [...activeBookings]
      .sort((left, right) => new Date(left.preferredDate ?? 0) - new Date(right.preferredDate ?? 0))[0]

    return {
      activeBookings,
      pendingPartRequests,
      primaryVehicle: vehicles.find((vehicle) => vehicle.isPrimary) ?? vehicles[0],
      recentInvoices,
      upcomingBooking,
    }
  }, [appointments, bookingInvoices, partRequests, salesInvoices, vehicles])

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-slate-600">Loading customer dashboard...</p>
      </section>
    )
  }

  return (
    <div className="grid gap-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Car} label="Vehicles" value={vehicles.length} note={dashboard.primaryVehicle ? `${dashboard.primaryVehicle.vehicleNumber} primary` : 'Add your first vehicle'} />
        <StatCard icon={CalendarCheck} label="Active Bookings" value={dashboard.activeBookings.length} note="Pending or in progress" tone="amber" />
        <StatCard icon={PackageSearch} label="Part Requests" value={dashboard.pendingPartRequests.length} note="Open customer requests" tone="blue" />
        <StatCard icon={ReceiptText} label="Invoices" value={salesInvoices.length + bookingInvoices.length} note="Sales and service records" tone="green" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PanelTitle icon={Wrench} kicker="Quick actions" title="What do you want to do next?" />
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
            <ActionButton icon={Plus} label="Add vehicle" onClick={() => navigate('/customer/vehicles')} />
            <ActionButton icon={CalendarCheck} label="Book service" onClick={() => navigate('/customer/bookings')} />
            <ActionButton icon={PackageSearch} label="Request part" onClick={() => navigate('/customer/part-requests')} />
            <ActionButton icon={FileText} label="Request report" onClick={() => navigate('/customer/settings')} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <DashboardPanel icon={Car} kicker="Garage" title="My Vehicles">
          <div className="grid gap-4 md:grid-cols-2">
            {vehicles.length > 0 ? vehicles.slice(0, 4).map((vehicle) => (
              <VehicleCard
                key={vehicle.customerVehicleId}
                vehicle={vehicle}
                onBook={() => navigate('/customer/bookings')}
                onHistory={() => navigate('/customer/history')}
                onPart={() => navigate('/customer/part-requests')}
              />
            )) : (
              <EmptyState
                icon={Car}
                title="No vehicles yet"
                text="Add a vehicle to unlock booking, part request, and history shortcuts."
                action="Add vehicle"
                onAction={() => navigate('/customer/vehicles')}
              />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel icon={CalendarCheck} kicker="Service" title="Upcoming Booking">
          {dashboard.upcomingBooking ? (
            <BookingCard appointment={dashboard.upcomingBooking} onOpen={() => navigate('/customer/bookings')} />
          ) : (
            <EmptyState
              icon={CalendarCheck}
              title="No active booking"
              text="Schedule service for your primary vehicle when you are ready."
              action="Book service"
              onAction={() => navigate('/customer/bookings')}
            />
          )}
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel icon={PackageSearch} kicker="Parts" title="Latest Part Requests">
          <div className="grid gap-3">
            {partRequests.length > 0 ? partRequests.slice(0, 3).map((request) => (
              <ActivityRow
                key={request.partRequestId}
                icon={PackageSearch}
                title={request.partName}
                meta={`${request.vehicleLabel || 'No vehicle selected'} | Qty ${request.quantity}`}
                status={request.status}
                onOpen={() => navigate('/customer/part-requests')}
              />
            )) : (
              <EmptyState
                icon={PackageSearch}
                title="No part requests"
                text="Ask staff to source parts for one of your vehicles."
                action="Request part"
                onAction={() => navigate('/customer/part-requests')}
              />
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel icon={History} kicker="History" title="Recent Invoices">
          <div className="grid gap-3">
            {dashboard.recentInvoices.length > 0 ? dashboard.recentInvoices.map((invoice) => (
              <ActivityRow
                key={`${invoice.kind}-${invoice.salesInvoiceId ?? invoice.bookingInvoiceId}`}
                icon={ReceiptText}
                title={`${invoice.kind} invoice ${invoice.invoiceNumber}`}
                meta={`${formatDate(invoice.date)} | ${formatMoney(invoice.totalAmount)}`}
                status={invoice.paymentStatus}
                onOpen={() => navigate('/customer/history')}
              />
            )) : (
              <EmptyState
                icon={ReceiptText}
                title="No invoices yet"
                text="Your sales and service invoices will appear here."
                action="View history"
                onAction={() => navigate('/customer/history')}
              />
            )}
          </div>
        </DashboardPanel>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, note, tone = 'red', value }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-[var(--primary)]',
  }[tone]

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <strong className="mt-3 block text-3xl font-black text-slate-950">{value}</strong>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={22} />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-600">{note}</p>
    </article>
  )
}

function DashboardPanel({ children, icon: Icon, kicker, title }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <PanelTitle icon={Icon} kicker={kicker} title={title} />
      <div className="mt-5">{children}</div>
    </section>
  )
}

function PanelTitle({ icon: Icon, kicker, title }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
        <Icon size={22} />
      </span>
      <div>
        <p className="text-xs font-black uppercase text-[var(--primary)]">{kicker}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
      type="button"
      onClick={onClick}
    >
      <Icon size={17} />
      {label}
    </button>
  )
}

function VehicleCard({ onBook, onHistory, onPart, vehicle }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="relative h-40 bg-slate-100">
        {vehicle.imageUrl ? (
          <img className="h-full w-full object-cover" src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} />
        ) : (
          <div className="grid h-full place-items-center text-slate-400">
            <Car size={48} />
          </div>
        )}
        {vehicle.isPrimary && (
          <span className="absolute left-3 top-3 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
            Primary
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-black uppercase text-[var(--primary)]">{vehicle.vehicleNumber}</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">{vehicle.make} {vehicle.model}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {[vehicle.year, vehicle.color, vehicle.fuelType].filter(Boolean).join(' / ') || 'Details not set'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton icon={CalendarCheck} label="Book" onClick={onBook} />
          <ActionButton icon={PackageSearch} label="Part" onClick={onPart} />
          <ActionButton icon={History} label="History" onClick={onHistory} />
        </div>
      </div>
    </article>
  )
}

function BookingCard({ appointment, onOpen }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[var(--primary)]">{appointment.appointmentNumber}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{appointment.displayServiceType}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{appointment.vehicleLabel}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="mt-4 grid gap-3">
        <InfoLine icon={Clock} label="Date" value={`${formatDate(appointment.preferredDate)} | ${appointment.preferredTimeSlot}`} />
        <InfoLine icon={Wrench} label="Urgency" value={appointment.urgency} />
      </div>
      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
        type="button"
        onClick={onOpen}
      >
        <CalendarCheck size={17} />
        View booking
      </button>
    </article>
  )
}

function ActivityRow({ icon: Icon, meta, onOpen, status, title }) {
  return (
    <button
      className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white"
      type="button"
      onClick={onOpen}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[var(--primary)] ring-1 ring-slate-200">
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-xs font-semibold text-slate-500">{meta}</span>
      </span>
      <StatusBadge status={status} />
    </button>
  )
}

function EmptyState({ action, icon: Icon, onAction, text, title }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-600">{text}</p>
      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
        type="button"
        onClick={onAction}
      >
        {action}
      </button>
    </div>
  )
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
      <Icon className="text-slate-400" size={17} />
      <div>
        <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value || 'Not set'}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const toneClass = {
    Available: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Confirmed: 'bg-emerald-100 text-emerald-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Partial: 'bg-amber-100 text-amber-700',
    InProgress: 'bg-blue-100 text-blue-700',
    InReview: 'bg-blue-100 text-blue-700',
    Unpaid: 'bg-red-100 text-red-700',
  }[status] ?? 'bg-slate-200 text-slate-700'

  return (
    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${toneClass}`}>
      {status || 'Status'}
    </span>
  )
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-NP', {
    currency: 'NPR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value || 0))
}

function formatDate(value) {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
