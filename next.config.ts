import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.tibiawiki.com.br",
      },
      {
        protocol: "https",
        hostname: "tibia.fandom.com",
      },
      {
        protocol: "https",
        hostname: "wiki.rubinot.com",
      },
    ],
  },
};

export default nextConfig;
