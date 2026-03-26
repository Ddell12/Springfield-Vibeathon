/**
 * Generates a WebContainer binary snapshot including node_modules.
 * Run: npx tsx scripts/generate-wc-snapshot.ts
 * Output: public/wc-snapshot.bin
 */
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { snapshot } from "@webcontainer/snapshot";

const TEMPLATE_DIR = join(import.meta.dirname, "../.wc-template");
const OUTPUT_PATH = join(import.meta.dirname, "../public/wc-snapshot.bin");

async function main() {
  console.log("1/4 Creating temp template directory...");
  if (!existsSync(TEMPLATE_DIR)) mkdirSync(TEMPLATE_DIR, { recursive: true });

  console.log("2/4 Writing template files...");
  const packageJson = {
    name: "vite-therapy",
    private: true,
    type: "module",
    scripts: { dev: "vite --host 0.0.0.0", build: "vite build", preview: "vite preview" },
    dependencies: {
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "lucide-react": "^0.469.0",
      motion: "^12.0.0",
      react: "19.0.0",
      "react-dom": "19.0.0",
      "tailwind-merge": "^3.5.0",
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "@vitejs/plugin-react": "^4.4.0",
      tailwindcss: "^4.0.0",
      typescript: "^5.7.0",
      vite: "^6.0.0",
    },
    overrides: { react: "19.0.0", "react-dom": "19.0.0" },
  };

  writeFileSync(join(TEMPLATE_DIR, "package.json"), JSON.stringify(packageJson, null, 2));

  console.log("3/4 Running npm install...");
  execSync("npm install", { cwd: TEMPLATE_DIR, stdio: "inherit" });

  console.log("4/4 Generating snapshot...");
  const snapshotBuffer = await snapshot(TEMPLATE_DIR);
  writeFileSync(OUTPUT_PATH, snapshotBuffer);

  const sizeMB = (snapshotBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`Snapshot written to ${OUTPUT_PATH} (${sizeMB} MB)`);

  // Clean up temp directory (~200MB node_modules)
  rmSync(TEMPLATE_DIR, { recursive: true, force: true });
  console.log("Cleaned up temp directory.");
}

main().catch((err) => {
  console.error("Snapshot generation failed:", err);
  process.exit(1);
});
