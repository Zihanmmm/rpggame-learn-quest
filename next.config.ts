import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["archiver", "better-sqlite3", "epub2", "pdf-parse"],
};

export default nextConfig;
