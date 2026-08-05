import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole:
      process.env.NEXT_PUBLIC_DISABLE_CONSOLE_LOGS === "true" || process.env.NODE_ENV === "production"
        ? { exclude: ["error"] }
        : false,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
