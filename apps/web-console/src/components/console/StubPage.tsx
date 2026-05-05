interface StubPageProps {
  title: string
  blurb: string
  shipsIn: string
  bullets?: string[]
}

export function StubPage({ title, blurb, shipsIn, bullets = [] }: StubPageProps) {
  return (
    <div className="px-8 py-8">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-[28px] font-semibold leading-tight text-[var(--fg-default)]">{title}</h1>
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--fg-subtle)]">
          {shipsIn}
        </span>
      </header>
      <div className="max-w-2xl rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-recessed)] p-8">
        <p className="text-[15px] text-[var(--fg-default)]">{blurb}</p>
        {bullets.length > 0 && (
          <ul className="mt-6 space-y-2 text-[14px] text-[var(--fg-muted)]">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="text-[var(--color-accent)]">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
