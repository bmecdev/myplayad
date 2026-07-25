import type { NextConfig } from "next";

// @ts-ignore
const nextConfig: NextConfig = {
  serverExternalPackages: [],
  serverActions: {
    bodySizeLimit: '500mb',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    }
  }
};

export default nextConfig;
