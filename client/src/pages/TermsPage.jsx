import { SectionHeader } from '../components/common/SectionHeader'

const terms = [
  ['Account access', 'Users are responsible for keeping their login details secure and for activity made through their account.'],
  ['Operational data', 'Inventory, customer, invoice, booking, and report data should be entered accurately for reliable business records.'],
  ['Service availability', 'Autocare is designed to support daily operations, but scheduled maintenance or infrastructure issues may affect access.'],
  ['Acceptable use', 'The platform must not be used to upload harmful content, interfere with service availability, or access records without permission.'],
]

export function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 lg:px-8">
      <SectionHeader
        eyebrow="Terms"
        title="Terms and conditions"
        body="These terms outline the expected use of Autocare for vehicle parts, service, customer, and inventory operations."
      />
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {terms.map(([title, body]) => (
          <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm" key={title}>
            <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
