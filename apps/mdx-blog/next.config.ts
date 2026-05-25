import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: 'https://blog-admin.sao-x.com/admin/:path*',
      },
    ]
  },
};

export default nextConfig;
