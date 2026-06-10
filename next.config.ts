import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/services", destination: "/fleet", permanent: true },
      { source: "/city-tours", destination: "/tours", permanent: true },
      { source: "/airport-transfer", destination: "/fleet", permanent: true },
      { source: "/location", destination: "/contact", permanent: true },
    ];
  },
};

export default nextConfig;
