import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  async rewrites() {
    // Optional same-origin API bridge for local development or a proxied deployment.
    const target = process.env.ATLAS_API_PROXY_URL?.replace(/\/$/, "");
    return target ? [{ source: "/api/:path*", destination: `${target}/:path*` }] : [];
  },

  async headers() {
    return [
      {
        // Public assets have stable names; Next manages its own hashed chunks.
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        // Brand icons change at stable URLs; browsers must be able to refresh them.
        source: "/:path(favicon\\.ico|atlas-icon\\.svg|apple-touch-icon\\.png|atlas-icon-192\\.png|atlas-icon-512\\.png|manifest\\.webmanifest)",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        // Security + performance headers for HTML pages
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
