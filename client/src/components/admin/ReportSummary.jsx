import { reports } from '../../data/mockData'

export function ReportSummary() {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      {reports.map((report) => (
        <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm" key={report.label}>
          <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{report.note}</p>
          <h3 className="mt-3 text-2xl font-black text-[#d36838]">{report.value}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{report.label}</p>
        </article>
      ))}
    </section>
  )
}
