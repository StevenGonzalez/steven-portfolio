import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  experimental: {
    mdxRs: true,
  },
};

export default withMDX(nextConfig);
