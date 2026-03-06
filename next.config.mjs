/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
    unoptimized: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // Allow access from local network IPs during development
  allowedDevOrigins: [
    "192.168.56.1",
    "192.168.1.*",
    "localhost",
  ],
};

export default nextConfig;
