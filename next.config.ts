import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Set basePath for GitHub Pages if repo name is taichinhapp
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
