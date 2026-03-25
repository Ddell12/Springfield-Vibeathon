import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Vite plugin that re-enables Vitest 1.x-style `const mock* = vi.fn()`
 * references in vi.mock() factories for Vitest 4+.
 *
 * In Vitest 4, vi.mock() factories are hoisted and called during module
 * loading (before module body code runs). `const mock*` variables referenced
 * in factories are in TDZ or uninitialized at that point.
 *
 * This plugin transforms vi.mock() factories to use getters for `mock*`
 * variable references, deferring evaluation to render time when the
 * variables are fully initialized.
 *
 * Example transformation:
 *   vi.mock("m", () => ({ useQuery: mockFn }))
 * becomes:
 *   vi.mock("m", () => ({ get useQuery() { return mockFn; } }))
 */
function mockVariableHoistingPlugin(): Plugin {
  return {
    name: "mock-variable-hoisting",
    enforce: "pre",
    transform(code, id) {
      // Only process test files
      if (!id.includes("__tests__") && !id.endsWith(".test.ts") && !id.endsWith(".test.tsx")) {
        return null;
      }
      // Only process files with both vi.mock and const mock* = vi.fn()
      if (!code.includes("vi.mock") || !code.match(/const\s+mock\w+\s*=/)) {
        return null;
      }

      // Convert const mock* = vi.fn() to var for proper hoisting semantics.
      // var declarations are hoisted (as undefined), and the assignment runs
      // in order. Getters in the factory object read the current value at call time.
      let transformed = code;

      // 1. Convert `const mock*` to `var mock*`
      transformed = transformed.replace(
        /\bconst\s+(mock\w+)\s*=/g,
        "var $1 ="
      );

      // 2. Rewrite `{ key: mockVar }` shorthand and `{ key: mockVar, ... }` in vi.mock factories
      // to use getters: `{ get key() { return mockVar; } }`
      // This handles the case where factory runs before var assignment
      transformed = transformed.replace(
        /vi\.mock\([^,]+,\s*\(\)\s*=>\s*\(\{([^}]+)\}\)\)/g,
        (match, objBody: string) => {
          // Rewrite each property that references a mock* variable
          const rewritten = objBody.replace(
            /(\w+):\s*(mock\w+)/g,
            (_: string, key: string, val: string) =>
              `get ${key}() { return ${val}; }`
          );
          return match.replace(objBody, rewritten);
        }
      );

      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), mockVariableHoistingPlugin()],
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
      // Mock react-resizable-panels in tests — the real library uses ResizeObserver
      // which isn't available in jsdom, causing "n is not a constructor" errors.
      "react-resizable-panels": path.resolve(__dirname, "./__mocks__/react-resizable-panels.tsx"),
    },
  },
});
