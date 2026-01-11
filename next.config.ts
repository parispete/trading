import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Using Webpack for DuckDB native module compatibility (use --webpack flag)

  // Configure allowed image domains if needed
  images: {
    remotePatterns: [],
  },

  // Webpack configuration for DuckDB native module compatibility
  webpack: (config, { isServer }) => {
    // DuckDB and related native modules should only run on server
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      // Exclude duckdb from client bundle
      config.externals = [...(config.externals || []), "duckdb-async", "duckdb"];
    }

    // Ignore HTML files from node-pre-gyp (used by native modules)
    config.module.rules.push({
      test: /\.html$/,
      loader: "ignore-loader",
    });

    return config;
  },

  // Mark duckdb packages as server-only
  serverExternalPackages: ["duckdb-async", "duckdb"],
};

export default nextConfig;
