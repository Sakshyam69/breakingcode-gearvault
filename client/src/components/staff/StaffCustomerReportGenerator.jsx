import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Crown,
  Download,
  FileText,
  Package,
  RefreshCw,
  Search,
  Star,
  User,
  Wrench,
} from 'lucide-react'
import {
  getCustomerReports,
} from '../../lib/auth'

const reportTypeOptions = [
  { label: 'Sales + Services', value: 'Combined' },
  { label: 'Sales only', value: 'SalesOnly' },
  { label: 'Services only', value: 'ServicesOnly' },
]

const emptyReport = {
  summary: {
    activeCustomers: 0,
    totalSalesRevenue: 0,
    totalServiceRevenue: 0,
    totalRevenue: 0,
    totalPendingCredit: 0,
    salesInvoiceCount: 0,
    bookingInvoiceCount: 0,
  },
  allCustomers: [],
}

export function StaffCustomerReportGenerator() {
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    reportType: 'Combined',
    scope: 'all',
    query: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [report, setReport] = useState(emptyReport)
  const [activeTag, setActiveTag] = useState('All')
  const [printRows, setPrintRows] = useState([])
  const [printTitle, setPrintTitle] = useState('All clients report')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      setIsLoading(true)
      setError('')

      try {
        const query = appliedFilters.scope === 'selected' ? appliedFilters.query : ''
        const reportData = await getCustomerReports({ ...appliedFilters, query })

        if (isMounted) {
          setReport(reportData)
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

    loadReports()

    return () => {
      isMounted = false
    }
  }, [appliedFilters])

  const rows = report.allCustomers ?? []
  const visibleRows = activeTag === 'All'
    ? rows
    : rows.filter((row) => row.segment === activeTag)

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => {
      const next = { ...current, [name]: value }
      if (name === 'scope' && value === 'all') {
        next.query = ''
      }
      return next
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    setActiveTag('All')
    setAppliedFilters(filters)
  }

  function exportReport(exportRows = visibleRows, title = getReportTitle(appliedFilters, exportRows)) {
    setPrintRows(exportRows)
    setPrintTitle(title)
    window.setTimeout(() => window.print(), 100)
  }

  return (
    <div className="grid gap-6">
      {error && <Message tone="error">{error}</Message>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1.15fr_1.1fr_minmax(240px,1.4fr)_auto]" onSubmit={handleSubmit}>
          <TextField label="From" name="from" onChange={handleFilterChange} type="date" value={filters.from} />
          <TextField label="To" name="to" onChange={handleFilterChange} type="date" value={filters.to} />
          <SelectField label="Report type" name="reportType" onChange={handleFilterChange} options={reportTypeOptions} value={filters.reportType} />
          <SelectField
            label="Report scope"
            name="scope"
            onChange={handleFilterChange}
            options={[
              { label: 'All clients', value: 'all' },
              { label: 'Selected client', value: 'selected' },
            ]}
            value={filters.scope}
          />
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Client search
            <span className={`flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-red-100 ${filters.scope === 'all' ? 'opacity-60' : ''}`}>
              <Search className="mr-2 text-slate-400" size={18} />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none"
                disabled={filters.scope === 'all'}
                name="query"
                placeholder="Name, phone, ID, vehicle"
                value={filters.query}
                onChange={handleFilterChange}
              />
            </span>
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            type="submit"
          >
            <RefreshCw size={18} />
            Generate
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BarChart3} label="Total Revenue" value={formatMoney(report.summary.totalRevenue)} note={`${report.summary.activeCustomers} clients in report`} />
        <StatCard icon={Package} label="Parts Sales" value={formatMoney(report.summary.totalSalesRevenue)} note={`${report.summary.salesInvoiceCount} sales invoices`} tone="blue" />
        <StatCard icon={Wrench} label="Services" value={formatMoney(report.summary.totalServiceRevenue)} note={`${report.summary.bookingInvoiceCount} service invoices`} tone="green" />
        <StatCard icon={AlertTriangle} label="Pending Credit" value={formatMoney(report.summary.totalPendingCredit)} note="Open customer balances" tone="amber" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-[var(--primary)]">{formatReportType(appliedFilters.reportType)}</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{getReportTitle(appliedFilters, rows)}</h2>
            </div>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-black text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              disabled={visibleRows.length === 0}
              onClick={() => exportReport()}
            >
              <Download size={17} />
              Export PDF
            </button>
          </div>

          <CustomerTagLegend activeTag={activeTag} onChange={setActiveTag} />

          {isLoading ? (
            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-600">Generating report...</p>
          ) : (
            <ReportTable rows={visibleRows} onExport={(row) => exportReport([row], `${row.customerName} report`)} />
          )}
      </section>

      <PrintableReport filters={appliedFilters} rows={printRows} title={printTitle} />
    </div>
  )
}

function ReportTable({ onExport, rows }) {
  if (rows.length === 0) {
    return <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-600">No report data found.</p>
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
            <th className="py-3 pr-4">Client</th>
            <th className="py-3 pr-4">Type</th>
            <th className="py-3 pr-4">Parts Sales</th>
            <th className="py-3 pr-4">Services</th>
            <th className="py-3 pr-4">Total</th>
            <th className="py-3 pr-4">Credit</th>
            <th className="py-3 pr-4">Activity</th>
            <th className="py-3">Export</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-slate-100 last:border-0" key={row.customerId}>
              <td className="py-4 pr-4">
                <p className="text-sm font-black text-slate-950">{row.customerName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{row.phone || row.email}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{row.vehicleNumbers || `${row.vehicleCount} vehicle(s)`}</p>
              </td>
              <td className="py-4 pr-4"><SegmentBadge row={row} /></td>
              <td className="py-4 pr-4 text-sm font-black text-slate-800">{formatMoney(row.salesSpent)}</td>
              <td className="py-4 pr-4 text-sm font-black text-slate-800">{formatMoney(row.serviceSpent)}</td>
              <td className="py-4 pr-4 text-sm font-black text-slate-900">{formatMoney(row.totalSpent)}</td>
              <td className={`py-4 pr-4 text-sm font-black ${row.totalCredit > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatMoney(row.totalCredit)}</td>
              <td className="py-4 pr-4 text-sm font-semibold text-slate-600">
                {row.salesInvoiceCount + row.bookingInvoiceCount} invoices, {row.serviceAppointmentCount + row.partRequestCount} requests
              </td>
              <td className="py-4">
                <button
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  aria-label={`Export ${row.customerName}`}
                  onClick={() => onExport(row)}
                >
                  <FileText size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SegmentBadge({ row }) {
  const Icon = iconMap[row.icon] ?? User
  const tone = getSegmentTone(row.segment)

  return (
    <span className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-black ${tone}`}>
      <Icon size={16} />
      {getTagLabel(row.segment)}
    </span>
  )
}

function CustomerTagLegend({ activeTag, onChange }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
      {customerTags.map((tag) => {
        const Icon = tag.icon
        const isActive = activeTag === tag.value

        return (
          <button
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
              isActive ? `${tag.className} border-current` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            key={tag.label}
            type="button"
            onClick={() => onChange(tag.value)}
          >
            <Icon size={15} />
            {tag.label}
          </button>
        )
      })}
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

function SelectField({ label, name, onChange, options, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function TextField({ label, name, onChange, type = 'text', value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-red-100"
        name={name}
        type={type}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}

function PrintableReport({ filters, rows, title }) {
  const selectedCustomer = rows.length === 1 ? rows[0] : null

  return (
    <section id="customer-report-print">
      <div className="print-header">
        <p>AutoCare Staff Customer Report</p>
        <h1>{title}</h1>
        <span>{formatReportType(filters.reportType)} | {filters.from || 'Start'} to {filters.to || 'Today'}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Type</th>
            <th>Parts Sales</th>
            <th>Services</th>
            <th>Total</th>
            <th>Credit</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`print-${row.customerId}`}>
              <td>
                <strong>{row.customerName}</strong>
                <br />
                {row.phone || row.email}
                <br />
                {row.vehicleNumbers}
              </td>
              <td>{getTagLabel(row.segment)}</td>
              <td>{formatMoney(row.salesSpent)}</td>
              <td>{formatMoney(row.serviceSpent)}</td>
              <td>{formatMoney(row.totalSpent)}</td>
              <td>{formatMoney(row.totalCredit)}</td>
              <td>{row.salesInvoiceCount + row.bookingInvoiceCount} invoices, {row.serviceAppointmentCount + row.partRequestCount} requests</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedCustomer && (
        <div className="print-details">
          {(filters.reportType === 'Combined' || filters.reportType === 'SalesOnly') && (
            <PrintDetailSection
              columns={['Invoice', 'Date', 'Items', 'Status', 'Total', 'Paid', 'Credit']}
              rows={(selectedCustomer.salesDetails ?? []).map((item) => [
                item.invoiceNumber,
                formatDate(item.invoiceDate),
                item.items || 'No items recorded',
                item.paymentStatus,
                formatMoney(item.totalAmount),
                formatMoney(item.paidAmount),
                formatMoney(item.creditAmount),
              ])}
              title="Part purchase details"
            />
          )}
          {(filters.reportType === 'Combined' || filters.reportType === 'ServicesOnly') && (
            <PrintDetailSection
              columns={['Invoice', 'Date', 'Service', 'Vehicle', 'Work summary', 'Status', 'Total', 'Paid', 'Credit']}
              rows={(selectedCustomer.serviceDetails ?? []).map((item) => [
                item.invoiceNumber || item.appointmentNumber,
                formatDate(item.invoiceDate),
                item.serviceType || 'Service',
                item.vehicleLabel || 'Vehicle not recorded',
                item.workSummary || 'No summary recorded',
                item.paymentStatus,
                formatMoney(item.totalAmount),
                formatMoney(item.paidAmount),
                formatMoney(item.creditAmount),
              ])}
              title="Service details"
            />
          )}
        </div>
      )}
    </section>
  )
}

function PrintDetailSection({ columns, rows, title }) {
  return (
    <section>
      <h2>{title}</h2>
      {rows.length > 0 ? (
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No records found.</p>
      )}
    </section>
  )
}

function Message({ children, tone }) {
  const className = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <p className={`rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>{children}</p>
}

function getReportTitle(filters, rows) {
  if (filters.scope === 'selected') {
    return rows.length === 1 ? `${rows[0].customerName} report` : 'Selected client report'
  }

  return 'All clients report'
}

function getSegmentTone(segment) {
  return {
    'Best Client': 'bg-amber-100 text-amber-700',
    'Regular Client': 'bg-blue-100 text-blue-700',
    'Pending Credit': 'bg-red-100 text-red-700',
    'Service Client': 'bg-emerald-100 text-emerald-700',
    'Parts Client': 'bg-violet-100 text-violet-700',
  }[segment] ?? 'bg-slate-100 text-slate-700'
}

function getTagLabel(segment) {
  return {
    'Best Client': 'Best customer',
    'Regular Client': 'Regular customer',
    'Pending Credit': 'Unpaid balance',
    'Service Client': 'Frequent service user',
    'Parts Client': 'Frequent parts buyer',
  }[segment] ?? 'Customer'
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

const iconMap = {
  AlertTriangle,
  Crown,
  Package,
  Star,
  User,
  Wrench,
}

const customerTags = [
  { label: 'All customers', value: 'All', icon: User, className: 'bg-slate-100 text-slate-700' },
  { label: 'Best customers', value: 'Best Client', icon: Crown, className: 'bg-amber-100 text-amber-700' },
  { label: 'Regular customers', value: 'Regular Client', icon: Star, className: 'bg-blue-100 text-blue-700' },
  { label: 'Customers with unpaid balances', value: 'Pending Credit', icon: AlertTriangle, className: 'bg-red-100 text-red-700' },
  { label: 'Frequent service users', value: 'Service Client', icon: Wrench, className: 'bg-emerald-100 text-emerald-700' },
  { label: 'Frequent parts buyers', value: 'Parts Client', icon: Package, className: 'bg-violet-100 text-violet-700' },
]

function formatDate(value) {
  if (!value) {
    return 'Not recorded'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value))
}
