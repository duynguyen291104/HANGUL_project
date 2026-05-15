/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/yolo/:path*',
        destination: `${process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5001'}/api/yolo/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
