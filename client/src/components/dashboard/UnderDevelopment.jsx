import { Construction } from 'lucide-react'

export function UnderDevelopment({ role }) {
  return (
    <section className="grid min-h-[calc(100vh-190px)] place-items-center rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-red-50 text-[var(--primary)]">
          <Construction size={28} />
        </span>
        <h2 className="mt-5 text-2xl font-black text-slate-950">{role} dashboard</h2>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          This dashboard section is under development.
        </p>
      </div>
    </section>
  )
}
