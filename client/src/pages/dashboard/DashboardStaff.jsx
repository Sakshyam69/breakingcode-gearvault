import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Clock, Download, Package, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCustomerReportRequests, getCustomerReports } from '../../lib/auth'

export function DashboardStaff() {
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const [reportData, requestData] = await Promise.all([
          getCustomerReports({ reportType: 'Combined' }),
          getCustomerReportRequests(),
        ])

        if (isMounted) {
          setReport(reportData)
          setRequests(requestData)
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

  const pendingRequests = useMemo(() => (
    requests.filter((request) => request.status === 'Pending')
  ), [requests])

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-slate-600">Loading staff overview...</p>
      </section>
    )
  }

  const summary = report?.summary ?? {
    activeCustomers: 0,
    totalRevenue: 0,
    totalSalesRevenue: 0,
    totalServiceRevenue: 0,
    totalPendingCredit: 0,
  }

  return (
    <div className="grid gap-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BarChart3} label="Customer Revenue" value={formatMoney(summary.totalRevenue)} note={`${summary.activeCustomers} active clients`} />
        <StatCard icon={Package} label="Parts Sales" value={formatMoney(summary.totalSalesRevenue)} note="Across sales invoices" tone="blue" />
        <StatCard icon={Wrench} label="Services" value={formatMoney(summary.totalServiceRevenue)} note="Across booking invoices" tone="green" />
        <StatCard icon={AlertTriangle} label="Pending Credit" value={formatMoney(summary.totalPendingCredit)} note="Open customer balances" tone="amber" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-[var(--primary)]">Reports</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Customer report export</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)]"
              type="button"
              onClick={() => navigate('/staff/reports')}
            >
              <Download size={18} />
              Export report
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              type="button"
              onClick={() => navigate('/staff/ai-services')}
            >
              <Activity size={18} />
              AI services
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ReportShortcut label="Sales only" onClick={() => navigate('/staff/reports')} />
          <ReportShortcut label="Services only" onClick={() => navigate('/staff/reports')} />
          <ReportShortcut label="Sales + Services" onClick={() => navigate('/staff/reports')} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase text-[var(--primary)]">Client Requests</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Pending Reports</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pendingRequests.length > 0 ? pendingRequests.map((request) => (
              <button
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white"
                key={request.customerReportRequestId}
                type="button"
                onClick={() => navigate('/staff/reports')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{request.customerName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatReportType(request.reportType)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                    <Clock size={14} />
                    Pending
                  </span>
                </div>
              </button>
          )) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600 md:col-span-2 xl:col-span-3">No pending report requests.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function ReportShortcut({ label, onClick }) {
  return (
    <button
      className="min-h-12 rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
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
          <strong className="mt-3 block text-2xl font-black text-slate-950">{value}</strong>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={22} />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-600">{note}</p>
    </article>
  )
}

function formatReportType(value) {
  return {
    SalesOnly: 'Sales only',
    ServicesOnly: 'Services only',
    Combined: 'Sales + Services',
  }[value] ?? 'Sales + Services'
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-NP', {
    currency: 'NPR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value || 0))
}
