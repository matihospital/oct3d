import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@oct3d/pricing", "@oct3d/db"],
};

export default nextConfig;
