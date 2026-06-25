import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for a small Docker image (next start with traced deps).
  output: "standalone",
  // Keep the native SQLite addon external so its prebuilt .node binary resolves at runtime.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
