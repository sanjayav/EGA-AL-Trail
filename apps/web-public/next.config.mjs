/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  // Public viewer is the most-traffic-sensitive surface (§10.8). Edge caching
  // is configured at the deployment layer; here we just ensure SSR pages have
  // sensible defaults and no client bundle bloat.
  transpilePackages: ['@dpp/ui', '@dpp/schema'],
  async headers() {
    return [
      {
        source: '/dpp/:upi*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
