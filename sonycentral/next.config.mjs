/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2']
  },
  async headers() {
    return [
      {
        source: '/api/chat/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
