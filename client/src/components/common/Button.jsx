export function Button({
  as: Component = 'button',
  children,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const variants = {
    primary:
      'bg-[var(--primary)] text-[var(--text-primary)] shadow-[0_18px_34px_rgba(239,68,68,0.22)] hover:bg-[var(--primary-hover)]',
    secondary:
      'border border-[var(--border)] bg-white/10 text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:text-[var(--bg-primary)]',
    accent:
      'bg-[var(--accent)] text-[var(--text-primary)] shadow-[0_18px_34px_rgba(244,63,94,0.22)] hover:bg-[var(--primary-hover)]',
    danger:
      'bg-[var(--primary)] text-[var(--text-primary)] shadow-[0_18px_34px_rgba(239,68,68,0.22)] hover:bg-[var(--primary-hover)]',
    lightOutline:
      'border border-[var(--border)] bg-transparent text-[var(--text-primary)] shadow-none hover:bg-white/10 hover:text-[var(--text-primary)]',
    text: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  }

  const componentProps = Component === 'button' ? { type } : {}

  return (
    <Component
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`}
      onClick={onClick}
      {...componentProps}
      {...props}
    >
      {children}
    </Component>
  )
}
