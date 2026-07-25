/** @type {import('next').NextConfig} */
const nextConfig = {
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
