/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(process.env.WATCHPACK_POLLING === 'true' ? { poll: 1000 } : {}),
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/storage/**', '**/.git/**'],
      };
    }
    return config;
  },
  async rewrites() {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
