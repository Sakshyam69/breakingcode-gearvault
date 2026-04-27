import { AdminOverview } from '../../components/admin/AdminOverview'
import { InventoryTable } from '../../components/admin/InventoryTable'
import { ReportSummary } from '../../components/admin/ReportSummary'
import { Button } from '../../components/common/Button'
import { SectionHeader } from '../../components/common/SectionHeader'

export function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow="Admin"
          title="Manage staff, stock, vendors, invoices, and reports."
          body="Monitor stock movement, vendor purchases, financial reports, and team activity from one command center."
        />
        <Button variant="accent">New purchase invoice</Button>
      </div>
      <div className="mt-10 grid gap-6">
        <AdminOverview />
        <ReportSummary />
        <InventoryTable />
      </div>
    </main>
  )
}
