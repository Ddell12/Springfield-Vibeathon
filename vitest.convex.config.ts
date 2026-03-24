import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    globals: true,
    include: ["convex/__tests__/**/*.{test,spec}.ts"],
    exclude: [".claude/**", "node_modules/**"],
    passWithNoTests: true,
  },
});
