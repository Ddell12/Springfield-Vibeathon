/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Global setup: register a TypeScript loader so that require() can load .ts files
 * in test files that use the CommonJS require() pattern.
 *
 * Note: This file intentionally uses require() because it registers CommonJS
 * extension handlers — there is no ESM equivalent for require.extensions.
 */
export default function () {
  if (typeof require !== "undefined" && require.extensions && !require.extensions[".ts"]) {
    const { transformSync } = require("esbuild");
    const fs = require("fs");

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

    require.extensions[".tsx"] = require.extensions[".ts"];
  }
}
