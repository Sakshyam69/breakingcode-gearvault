export function MetricCard({ label, value, note }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</p>
      <strong className="mt-3 block text-3xl font-black tracking-tight text-[var(--text-primary)]">
        {value}
      </strong>
      <span className="mt-2 block text-sm text-[var(--text-secondary)]">{note}</span>
    </article>
  )
}
