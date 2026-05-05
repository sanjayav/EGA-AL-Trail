/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@dpp/ui', '@dpp/schema'],
  async headers() {
    return [
      {
        // Console pages — defence in depth alongside the API's headers
        // middleware. Match every console-tier path.
        source: '/(console|verifier|admin|authority|portal)/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
        ],
      },
    ]
  },
}

export default nextConfig
