import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // esbuild ships a native binary that Turbopack can't parse — keep it external
  serverExternalPackages: ["esbuild"],
  // Include the WAB scaffold (and its prod node_modules installed by postinstall)
  // in the /api/generate serverless function so esbuild can resolve imports at runtime
  outputFileTracingIncludes: {
    "/api/generate": [
      "./artifacts/wab-scaffold/**/*",
      "./scripts/bundle-worker.mjs",
    ],
  },
  async headers() {
    return [
      {
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
    ];
  },
};

export default nextConfig;
