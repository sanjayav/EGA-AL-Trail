import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        404 · Passport not found
      </p>
      <h1 className="font-display mt-4 text-[clamp(48px,8vw,96px)] font-light leading-[0.95] text-[var(--fg-default)]">
        Nothing here.
      </h1>
      <p className="mt-4 max-w-md text-[16px] text-[var(--fg-muted)]">
        The Digital Product Passport you're looking for doesn't exist, has been withdrawn, or has
        expired beyond the 10-year retention window.
      </p>
      <Link
        href="/"
        className="mt-8 self-start text-[15px] text-[var(--color-gold-deep)] underline-offset-4 hover:underline"
      >
        ← Back to home
      </Link>
    </main>
  )
}
