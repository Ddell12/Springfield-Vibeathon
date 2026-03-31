import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // esbuild ships a native binary that Turbopack can't parse — keep it external
  serverExternalPackages: ["esbuild"],
  // recharts uses CJS without explicit package.json exports — Turbopack needs this
  transpilePackages: ["recharts"],
  // Include the WAB scaffold (and its prod node_modules installed by postinstall)
  // in the /api/generate serverless function so esbuild can resolve imports at runtime
  outputFileTracingIncludes: {
    "/api/generate": [
      "./artifacts/wab-scaffold/**/*",
      "./scripts/bundle-worker.mjs",
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/builder", permanent: true },
      { source: "/flashcards", destination: "/builder", permanent: true },
      { source: "/templates", destination: "/library?tab=templates", permanent: true },
      { source: "/my-tools",   destination: "/library?tab=my-apps", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Default policy: block camera everywhere except call pages
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
      {
        // Allow camera + microphone on teletherapy call pages
        source: "/sessions/:id/call",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
