import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // Next.js does not directory-index public/, so /kit must map to the file.
      beforeFiles: [{ source: "/kit", destination: "/kit/index.html" }],
    };
  },
};

export default withPWA(nextConfig);
