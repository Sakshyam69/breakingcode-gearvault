import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Calendar, RefreshCw } from 'lucide-react'
import { getFinancialReport } from '../../lib/auth'
import { MetricCard } from '../common/MetricCard'

const granularityOptions = [
  { label: 'Daily', value: 'Daily' },
  { label: 'Monthly', value: 'Monthly' },
  { label: 'Yearly', value: 'Yearly' },
]

export function AdminFinancialReports() {
  const [filters, setFilters] = useState(() => ({
    from: '2026-04-01',
    to: getTodayInputValue(),
    granularity: 'Monthly',
  }))
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadReport() {
      setIsLoading(true)
      setError('')
      try {
        const data = await getFinancialReport(appliedFilters)
        if (isMounted) setReport(data)
      } catch (exception) {
        if (isMounted) setError(exception.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadReport()

    return () => {
      isMounted = false
    }
  }, [appliedFilters])

  const summary = report?.summary ?? {
    partsSalesRevenue: 0,
    serviceRevenue: 0,
    totalRevenue: 0,
    purchaseExpense: 0,
    netRevenue: 0,
    salesInvoiceCount: 0,
    bookingInvoiceCount: 0,
    purchaseInvoiceCount: 0,
  }

  const series = report?.series ?? []

  const revenueRows = useMemo(() => series.map((point) => ({
    label: point.label,
    value: Number(point.totalRevenue || 0),
  })), [series])

  const expenseRows = useMemo(() => series.map((point) => ({
    label: point.label,
    value: Number(point.purchaseExpense || 0),
  })), [series])

  const netRows = useMemo(() => series.map((point) => ({
    label: point.label,
    value: Number(point.netRevenue || 0),
  })), [series])

  function handleChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function apply(event) {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  return (
    <div className="grid gap-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-[var(--primary)]">Admin</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Financial Reports</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Track revenue, purchases, and net movement over time.</p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
            <BarChart3 size={22} />
          </span>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_240px_auto]" onSubmit={apply}>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            From
            <input
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              name="from"
              type="date"
              value={filters.from}
              onChange={handleChange}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            To
            <input
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              name="to"
              type="date"
              value={filters.to}
              onChange={handleChange}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Granularity
            <select
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
              name="granularity"
              value={filters.granularity}
              onChange={handleChange}
            >
              {granularityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            type="submit"
          >
            <RefreshCw size={18} />
            {isLoading ? 'Loading...' : 'Generate'}
          </button>
        </form>

        {report?.from && report?.to && (
          <p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Calendar size={14} />
            {formatDate(report.from)} to {formatDate(report.to)}
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Revenue" value={formatMoney(summary.totalRevenue)} />
        <MetricCard label="Purchase Expense" value={formatMoney(summary.purchaseExpense)} />
        <MetricCard label="Net Revenue" value={formatMoney(summary.netRevenue)} />
        <MetricCard label="Invoices" value={`${summary.salesInvoiceCount + summary.bookingInvoiceCount}`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Revenue trend" subtitle="Sales + services total">
          <MiniBarChart rows={revenueRows} formatter={formatMoney} emptyLabel="No revenue data in range." />
        </ChartPanel>
        <ChartPanel title="Purchase trend" subtitle="Purchase invoice totals">
          <MiniBarChart rows={expenseRows} formatter={formatMoney} emptyLabel="No purchase data in range." />
        </ChartPanel>
        <ChartPanel title="Net movement" subtitle="Revenue minus purchases">
          <MiniBarChart rows={netRows} formatter={formatMoney} emptyLabel="No net data in range." />
        </ChartPanel>
      </section>
    </div>
  )
}

function ChartPanel({ children, subtitle, title }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function MiniBarChart({ emptyLabel, formatter, rows }) {
  const maxValue = Math.max(...rows.map((row) => Number(row.value || 0)), 0)

  if (rows.length === 0 || maxValue === 0) {
    return <p className="text-sm font-semibold text-slate-600">{emptyLabel}</p>
  }

  return (
    <div className="grid gap-3">
      {rows.slice(-8).map((row) => {
        const value = Number(row.value || 0)
        const width = `${Math.max((Math.abs(value) / maxValue) * 100, 6)}%`
        const isNegative = value < 0
        const barClass = isNegative ? 'bg-slate-400' : 'bg-[var(--primary)]'

        return (
          <div className="grid gap-1" key={row.label}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="font-black text-slate-700">{row.label}</span>
              <span className={`font-bold ${isNegative ? 'text-slate-600' : 'text-slate-500'}`}>{formatter(value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-lg bg-slate-100">
              <div className={`h-full rounded-lg ${barClass}`} style={{ width }} />
            </div>
          </div>
        )
      })}
    </div>
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
  if (!value) return ''
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
