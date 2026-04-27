import { MetricCard } from '../common/MetricCard'
import { activity, stats } from '../../data/mockData'

export function AdminOverview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="grid gap-4 sm:grid-cols-2">
        {stats.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>
      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
        <h2 className="text-xl font-black text-[var(--text-primary)]">Admin alerts</h2>
        <ul className="mt-4 grid gap-3">
          {activity.map((item) => (
            <li className="rounded-lg bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-secondary)]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
