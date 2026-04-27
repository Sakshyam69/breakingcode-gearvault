const actions = ['Register customer', 'Create sales invoice', 'Email invoice', 'Search vehicle']

export function StaffActions() {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
      <h2 className="text-xl font-black text-[var(--text-primary)]">Staff counter actions</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            className="flex min-h-20 items-center gap-3 rounded-lg bg-[var(--bg-secondary)] p-4 text-left font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-card)]"
            type="button"
            key={action}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#435331] text-xs text-white">
              {action.slice(0, 2).toUpperCase()}
            </span>
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}
