import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Required for src/instrumentation.ts (scheduler, etc.)
  experimental: { instrumentationHook: true },
};

export default nextConfig;
