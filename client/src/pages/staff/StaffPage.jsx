import { CustomerSearchPanel } from '../../components/staff/CustomerSearchPanel'
import { StaffActions } from '../../components/staff/StaffActions'
import { SectionHeader } from '../../components/common/SectionHeader'

export function StaffPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <SectionHeader
        eyebrow="Staff"
        title="Sell parts, register customers, and keep the counter moving."
        body="Staff screens focus on customer registration, sales invoices, email invoice actions, and fast search by vehicle, phone, name, or ID."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <StaffActions />
        <CustomerSearchPanel />
      </div>
    </main>
  )
}
