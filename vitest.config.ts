import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}", "convex/**/*.test.ts"],
    exclude: [".claude/**", "node_modules/**", "tests/e2e/**"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}", "convex/**/*.ts"],
      exclude: [
        "src/shared/components/ui/**",
        "src/app/**",
        "src/env.ts",
        "src/core/config.ts",
        "src/test/**",
        "convex/_generated/**",
        "convex/schema.ts",
        "convex/convex.config.ts",
        "convex/knowledge/data.ts",
        "convex/aiActions.ts",
        "convex/agents/**",
        "convex/chat/**",
        "convex/init.ts",
        "convex/knowledge/seed.ts",
        "convex/knowledge/search.ts",
        "convex/templates/seed.ts",
        "src/core/providers.tsx",
        "src/features/builder/components/chat/**",
        "**/*.d.ts",
        "**/__tests__/**",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
