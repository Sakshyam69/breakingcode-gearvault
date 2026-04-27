import { customerHistory } from '../../data/mockData'

export function CustomerProfileCard() {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--text-primary)]">Profile and history</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {['Full name', 'Phone number', 'Vehicle number', 'Vehicle model'].map((label) => (
          <label className="grid gap-2 text-sm font-bold text-[var(--text-secondary)]" key={label}>
            {label}
            <input
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/20"
              placeholder={label}
            />
          </label>
        ))}
      </div>
      <ul className="mt-5 grid gap-3">
        {customerHistory.map((item) => (
          <li className="rounded-lg bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-secondary)]" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
