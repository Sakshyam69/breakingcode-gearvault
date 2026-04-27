export function SectionHeader({ eyebrow, title, body }) {
  return (
    <div className="max-w-3xl">
      <span className="inline-flex rounded-full bg-[var(--primary)]/15 px-3 py-1 text-xs font-black uppercase text-[var(--primary)]">
        {eyebrow}
      </span>
      <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal text-[var(--text-primary)] md:text-6xl">
        {title}
      </h1>
      {body && <p className="mt-4 text-base leading-7 text-[var(--text-secondary)] md:text-lg">{body}</p>}
    </div>
  )
}
