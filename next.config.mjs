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
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Add pageExtensions to ensure Next.js recognizes all page files
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Add trailingSlash to ensure consistent URL handling
  trailingSlash: false,
  // Configure experimental features
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-toast',
      'lucide-react',
      'date-fns',
      'recharts',
    ],
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