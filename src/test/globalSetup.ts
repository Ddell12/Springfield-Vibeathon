import { register } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Global setup: register a TypeScript loader so that require() can load .ts files
 * in test files that use the CommonJS require() pattern.
 */
export default function () {
  // Only register if not already done
  if (typeof require !== "undefined" && require.extensions && !require.extensions[".ts"]) {
    // Use esbuild-based transform for .ts files via require.extensions
    // This is needed for tests that use Jest-style require() pattern
    const { transformSync } = require("esbuild");
    const path = require("path");
    const fs = require("fs");
    const Module = require("module");

    // Register .ts extension handler that uses esbuild to transform
    require.extensions[".ts"] = function (module: NodeModule, filename: string) {
      const source = fs.readFileSync(filename, "utf8");
      const result = transformSync(source, {
        loader: "ts",
        format: "cjs",
        target: "es2020",
        sourcefile: filename,
        jsx: "transform",
        jsxImportSource: "react",
      });
      (module as NodeModule & { _compile: (code: string, filename: string) => void })._compile(result.code, filename);
    };

    // Also register .tsx extension
    require.extensions[".tsx"] = require.extensions[".ts"];
  }
}
