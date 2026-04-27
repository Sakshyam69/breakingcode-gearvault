import { Button } from '../components/common/Button'
import { SectionHeader } from '../components/common/SectionHeader'

const contactMethods = [
  ['Sales', 'sales@autocare.local', 'For product demos and pricing conversations.'],
  ['Support', 'support@autocare.local', 'For account, setup, and workflow assistance.'],
  ['Office', 'Kathmandu, Nepal', 'Available Sunday to Friday, 9:00 AM to 6:00 PM.'],
]

export function ContactPage() {
  return (
    <main className="mx-auto grid w-full max-w-[1480px] gap-8 px-4 py-14 md:px-8 lg:grid-cols-[0.9fr_1.1fr] xl:px-10">
      <section>
        <SectionHeader
          eyebrow="Contact us"
          title="Bring your parts counter into one clean workspace."
          body="Share a few details and the Autocare team will help map the right workflow for your service center or parts shop."
        />
        <div className="mt-8 grid gap-4">
          {contactMethods.map(([title, value, body]) => (
            <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm" key={title}>
              <p className="text-sm font-black uppercase text-[var(--primary)]">{title}</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Send a message</h2>
        <form className="mt-6 grid gap-4">
          {['Full name', 'Business name', 'Email address', 'Phone number'].map((label) => (
            <label className="grid gap-2 text-sm font-bold text-[var(--text-secondary)]" key={label}>
              {label}
              <input
                className="min-h-12 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/20"
                placeholder={label}
              />
            </label>
          ))}
          <label className="grid gap-2 text-sm font-bold text-[var(--text-secondary)]">
            Message
            <textarea
              className="min-h-32 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/20"
              placeholder="Tell us about your inventory, service, or invoicing workflow"
            ></textarea>
          </label>
          <Button className="min-h-12" variant="accent">Submit message</Button>
        </form>
      </section>
    </main>
  )
}
