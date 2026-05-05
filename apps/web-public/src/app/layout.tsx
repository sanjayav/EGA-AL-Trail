import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Digital Product Passport · EGA',
    template: '%s · Digital Product Passport',
  },
  description:
    'Verifiable Digital Product Passport from Emirates Global Aluminium · ESPR-aligned, signed, scannable.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_RESOLVER_BASE_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'EGA Digital Product Passport',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#F5F1E8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="editorial">
      <head>
        {/* Google Fonts · Fraunces display, Geist body, JetBrains Mono. In production these are self-hosted. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Geist:wght@300..700&family=JetBrains+Mono:wght@400..600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
