/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Allow large video uploads via server actions (default is 1MB)
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
