import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    mdxRs: true,
  },
};

export default withMDX(nextConfig);
