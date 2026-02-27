import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cheerio", "rss-parser", "node-cron"]
};

export default nextConfig;
