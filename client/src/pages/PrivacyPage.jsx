import { SectionHeader } from '../components/common/SectionHeader'

const privacyItems = [
  ['Information collected', 'Autocare may store account, contact, vehicle, invoice, booking, service history, and inventory activity records.'],
  ['How data is used', 'Data is used to manage stock, support sales and service workflows, send reminders, and improve customer support.'],
  ['Access control', 'Role-based access helps ensure admins, staff, and customers only see information relevant to their responsibilities.'],
  ['Data care', 'Business records should be protected with secure authentication, careful permissions, and regular operational backups.'],
]

export function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 lg:px-8">
      <SectionHeader
        eyebrow="Privacy"
        title="Privacy policy"
        body="This policy explains how Autocare handles operational and customer information for a vehicle parts service business."
      />
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {privacyItems.map(([title, body]) => (
          <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm" key={title}>
            <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
