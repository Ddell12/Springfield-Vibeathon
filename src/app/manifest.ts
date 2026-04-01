import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vocali — AI Therapy App Builder",
    short_name: "Vocali",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#f8faf8",
    background_color: "#f8faf8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
