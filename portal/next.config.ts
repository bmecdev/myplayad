import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  serverActions: {
    bodySizeLimit: '500mb',
  },
};

export default nextConfig;
