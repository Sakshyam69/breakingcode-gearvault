import { BookingForm } from '../../components/customer/BookingForm'
import { CustomerProfileCard } from '../../components/customer/CustomerProfileCard'
import { SectionHeader } from '../../components/common/SectionHeader'

export function CustomerPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <SectionHeader
        eyebrow="Customer"
        title="Self-service for profile, vehicles, bookings, and history."
        body="Customers can manage their vehicle details, review past service or purchases, request unavailable parts, and book appointments."
      />
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <CustomerProfileCard />
        <BookingForm />
      </div>
    </main>
  )
}
