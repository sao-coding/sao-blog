import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: 'https://blog-admin.sao-x.com/:path*',
      },
    ]
  },
};

export default nextConfig;
