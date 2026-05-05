import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Mail, ReceiptText, Truck, Users, WalletCards } from 'lucide-react'
import { getAdminOverdueCredits, getParts, getPurchaseInvoices, getUsers, getVendors } from '../../lib/auth'

export function DashboardAdmin() {
  const [users, setUsers] = useState([])
  const [vendors, setVendors] = useState([])
  const [parts, setParts] = useState([])
  const [purchaseInvoices, setPurchaseInvoices] = useState([])
  const [overdueCredits, setOverdueCredits] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        const [userData, vendorData, partData, invoiceData, overdueData] = await Promise.all([
          getUsers(),
          getVendors(),
          getParts(),
          getPurchaseInvoices(),
          getAdminOverdueCredits(12),
        ])

        if (isMounted) {
          setUsers(userData)
          setVendors(vendorData)
          setParts(partData)
          setPurchaseInvoices(invoiceData)
          setOverdueCredits(overdueData)
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

  const overview = useMemo(() => {
    const activeInvoices = purchaseInvoices.filter((invoice) => !invoice.isCancelled)
    const lowStockParts = parts.filter((part) => part.isLowStock)
    const purchaseTotal = activeInvoices.reduce((total, invoice) => total + Number(invoice.totalAmount || 0), 0)
    const stockUnits = parts.reduce((total, part) => total + Number(part.quantityInStock || 0), 0)
    const estimatedStockValue = parts.reduce((total, part) => (
      total + (Number(part.quantityInStock || 0) * Number(part.sellingPrice || 0))
    ), 0)
    const staffCount = users.filter((user) => user.role === 'Staff').length
    const customerCount = users.filter((user) => user.role === 'Customer').length

    return {
      activeInvoices,
      customerCount,
      estimatedStockValue,
      lowStockParts,
      purchaseTotal,
      staffCount,
      stockUnits,
    }
  }, [parts, purchaseInvoices, users])

  const categoryRows = useMemo(() => {
    const rows = parts.reduce((groups, part) => {
      const key = part.category || 'Uncategorized'
      const current = groups.get(key) ?? { label: key, units: 0, value: 0 }
      current.units += Number(part.quantityInStock || 0)
      current.value += Number(part.quantityInStock || 0) * Number(part.sellingPrice || 0)
      groups.set(key, current)
      return groups
    }, new Map())

    return [...rows.values()]
      .sort((left, right) => right.units - left.units)
      .slice(0, 5)
  }, [parts])

  const monthlyPurchases = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en', { month: 'short' })
    const rows = purchaseInvoices
      .filter((invoice) => !invoice.isCancelled)
      .reduce((groups, invoice) => {
        const date = new Date(invoice.purchaseDate)
        const key = `${date.getFullYear()}-${date.getMonth()}`
        const current = groups.get(key) ?? {
          label: formatter.format(date),
          sortValue: date.getFullYear() * 12 + date.getMonth(),
          total: 0,
        }
        current.total += Number(invoice.totalAmount || 0)
        groups.set(key, current)
        return groups
      }, new Map())

    return [...rows.values()]
      .sort((left, right) => left.sortValue - right.sortValue)
      .slice(-6)
  }, [purchaseInvoices])

  const paymentRows = useMemo(() => {
    const statuses = ['Paid', 'Partial', 'Unpaid']
    return statuses.map((status) => {
      const count = purchaseInvoices.filter((invoice) => (
        !invoice.isCancelled && invoice.paymentStatus === status
      )).length

      return { label: status, value: count }
    })
  }, [purchaseInvoices])

  const recentInvoices = useMemo(() => (
    [...purchaseInvoices]
      .sort((left, right) => new Date(right.purchaseDate) - new Date(left.purchaseDate))
      .slice(0, 5)
  ), [purchaseInvoices])

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-slate-600">Loading admin overview...</p>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Boxes} label="Active parts" value={parts.length} note={`${overview.stockUnits} units in stock`} />
        <StatCard icon={AlertTriangle} label="Low stock" value={overview.lowStockParts.length} note="Below reorder level" tone="amber" />
        <StatCard icon={ReceiptText} label="Purchase invoices" value={overview.activeInvoices.length} note={`${purchaseInvoices.length - overview.activeInvoices.length} cancelled`} />
        <StatCard icon={WalletCards} label="Purchase value" value={formatMoney(overview.purchaseTotal)} note="From active invoices" tone="green" />
        <StatCard icon={Truck} label="Vendors" value={vendors.length} note="Active supplier records" />
        <StatCard icon={Users} label="Users" value={users.length} note={`${overview.staffCount} staff, ${overview.customerCount} customers`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <DashboardPanel title="Purchase Trend" subtitle="Last six purchase months">
          <BarChart rows={monthlyPurchases} valueKey="total" formatter={formatMoney} emptyLabel="No purchase invoices yet." />
        </DashboardPanel>

        <DashboardPanel title="Payment Status" subtitle="Active purchase invoices">
          <StatusBars rows={paymentRows} />
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <DashboardPanel title="Inventory Categories" subtitle={`${formatMoney(overview.estimatedStockValue)} estimated selling value`}>
          <BarChart rows={categoryRows} valueKey="units" formatter={(value) => `${value} units`} emptyLabel="No parts added yet." />
        </DashboardPanel>

        <DashboardPanel title="Low Stock Parts" subtitle="Items needing purchase invoices">
          <LowStockTable parts={overview.lowStockParts.slice(0, 6)} />
        </DashboardPanel>
      </section>

      <DashboardPanel title="Overdue Credits" subtitle="Unpaid balance older than 1 month">
        <OverdueCreditsTable rows={overdueCredits} />
      </DashboardPanel>

      <DashboardPanel title="Recent Purchase Invoices" subtitle="Latest stock update records">
        <RecentInvoiceTable invoices={recentInvoices} />
      </DashboardPanel>
    </div>
  )
}

function StatCard({ icon: Icon, label, note, tone = 'red', value }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-700',
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

function DashboardPanel({ children, subtitle, title }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function BarChart({ emptyLabel, formatter, rows, valueKey }) {
  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 0)

  if (rows.length === 0 || maxValue === 0) {
    return <p className="text-sm font-semibold text-slate-600">{emptyLabel}</p>
  }

  return (
    <div className="grid gap-4">
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0)
        const width = `${Math.max((value / maxValue) * 100, 6)}%`

        return (
          <div className="grid gap-2" key={row.label}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-black text-slate-700">{row.label}</span>
              <span className="font-bold text-slate-500">{formatter(value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-lg bg-slate-100">
              <div className="h-full rounded-lg bg-[var(--primary)]" style={{ width }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OverdueCreditsTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
        No overdue credits found.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Overdue</th>
            <th className="px-4 py-3">Invoices</th>
            <th className="px-4 py-3">Oldest due</th>
            <th className="px-4 py-3">Last reminder</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((row) => (
            <tr key={row.customerId} className="border-t border-slate-200 bg-white">
              <td className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
                    <Mail size={18} />
                  </span>
                  <div>
                    <p className="font-black text-slate-900">{row.fullName || `Customer #${row.customerId}`}</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{row.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-black text-slate-900">{formatMoney(row.totalOverdueAmount)}</td>
              <td className="px-4 py-3 text-slate-700">
                <p className="font-bold">{Number(row.salesInvoiceCount || 0) + Number(row.bookingInvoiceCount || 0)}</p>
                <p className="mt-0.5 text-xs font-bold text-slate-500">Parts {row.salesInvoiceCount} • Service {row.bookingInvoiceCount}</p>
              </td>
              <td className="px-4 py-3 font-bold text-slate-700">{formatDate(row.oldestDueDate)}</td>
              <td className="px-4 py-3 font-bold text-slate-700">{row.lastReminderAt ? formatDateTime(row.lastReminderAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function StatusBars({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const colorByStatus = {
    Paid: 'bg-emerald-500',
    Partial: 'bg-amber-500',
    Unpaid: 'bg-red-500',
  }

  if (total === 0) {
    return <p className="text-sm font-semibold text-slate-600">No active invoices yet.</p>
  }

  return (
    <div className="grid gap-4">
      <div className="flex h-4 overflow-hidden rounded-lg bg-slate-100">
        {rows.map((row) => row.value > 0 && (
          <div
            className={colorByStatus[row.label]}
            key={row.label}
            style={{ width: `${(row.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={row.label}>
            <span className="flex items-center gap-2 font-black text-slate-700">
              <span className={`h-3 w-3 rounded-sm ${colorByStatus[row.label]}`} />
              {row.label}
            </span>
            <span className="font-bold text-slate-500">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LowStockTable({ parts }) {
  if (parts.length === 0) {
    return <p className="text-sm font-semibold text-slate-600">No low stock parts right now.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[560px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
            <th className="py-3 pr-4">Part</th>
            <th className="py-3 pr-4">Stock</th>
            <th className="py-3 pr-4">Reorder</th>
            <th className="py-3">Category</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr className="border-b border-slate-100 last:border-0" key={part.partId}>
              <td className="py-3 pr-4">
                <p className="text-sm font-black text-slate-950">{part.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{part.partNumber}</p>
              </td>
              <td className="py-3 pr-4 text-sm font-black text-red-600">{part.quantityInStock}</td>
              <td className="py-3 pr-4 text-sm font-semibold text-slate-700">{part.reorderLevel}</td>
              <td className="py-3 text-sm font-semibold text-slate-700">{part.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecentInvoiceTable({ invoices }) {
  if (invoices.length === 0) {
    return <p className="text-sm font-semibold text-slate-600">No purchase invoices yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-500">
            <th className="py-3 pr-4">Invoice</th>
            <th className="py-3 pr-4">Vendor</th>
            <th className="py-3 pr-4">Items</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr className="border-b border-slate-100 last:border-0" key={invoice.purchaseInvoiceId}>
              <td className="py-3 pr-4">
                <p className="text-sm font-black text-slate-950">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(invoice.purchaseDate)}</p>
              </td>
              <td className="py-3 pr-4 text-sm font-semibold text-slate-700">{invoice.vendorName}</td>
              <td className="py-3 pr-4 text-sm font-semibold text-slate-700">{invoice.items?.length ?? 0}</td>
              <td className="py-3 pr-4">
                <span className={`rounded-lg border px-2.5 py-1 text-xs font-black uppercase ${getStatusClass(invoice)}`}>
                  {invoice.isCancelled ? 'Cancelled' : invoice.paymentStatus}
                </span>
              </td>
              <td className="py-3 text-sm font-black text-slate-900">{formatMoney(invoice.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getStatusClass(invoice) {
  if (invoice.isCancelled) {
    return 'border-slate-300 bg-slate-100 text-slate-700'
  }

  if (invoice.paymentStatus === 'Paid') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (invoice.paymentStatus === 'Partial') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-red-200 bg-red-50 text-red-700'
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

function formatMoney(value) {
  return new Intl.NumberFormat('en-NP', {
    currency: 'NPR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value || 0))
}
