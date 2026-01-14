/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Add pageExtensions to ensure Next.js recognizes all page files
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Add trailingSlash to ensure consistent URL handling
  trailingSlash: false,
  // Configure experimental features
  // Configure experimental features
  experimental: {
    // serverActions are now stable in Next.js 14+
    // optimizePackageImports is also stable or moved
  },
  // Add output configuration
  output: 'standalone',
  // Skip static page generation during build
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig; 