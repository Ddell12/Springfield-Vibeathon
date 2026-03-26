/**
 * Analyze the quality of AI-generated code from a builder session.
 *
 * Usage:
 *   npx tsx scripts/analyze-generation.ts                     # analyze most recent session
 *   npx tsx scripts/analyze-generation.ts <sessionId>         # analyze specific session
 *   npx tsx scripts/analyze-generation.ts --all               # analyze all sessions
 *   npx tsx scripts/analyze-generation.ts --last 5            # analyze last 5 sessions
 */
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Convex helpers
// ---------------------------------------------------------------------------

function convexRun(fn: string, args: Record<string, unknown> = {}): unknown {
  const argsJson = JSON.stringify(args);
  const result = execSync(`npx convex run ${fn} '${argsJson}'`, {
    encoding: "utf-8",
    timeout: 15_000,
  });
  return JSON.parse(result);
}

interface Session {
  _id: string;
  _creationTime: number;
  title: string;
  query: string;
  state: string;
}

interface GeneratedFile {
  _id: string;
  path: string;
  contents: string;
  version: number;
  sessionId: string;
}

// ---------------------------------------------------------------------------
// Analysis checks
// ---------------------------------------------------------------------------

/** Known template files — anything imported from these paths must exist in template OR be generated */
const TEMPLATE_FILES = new Set([
  "src/main.tsx",
  "src/App.tsx",
  "src/therapy-ui.css",
  "package.json",
  "index.html",
  "vite.config.ts",
  "tsconfig.json",
]);

/** Extract all import paths from a TypeScript/TSX file */
function extractImports(contents: string): Array<{ from: string; names: string[]; line: number }> {
  const imports: Array<{ from: string; names: string[]; line: number }> = [];
  const lines = contents.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+["']([^"']+)["']/);
    if (match) {
      const names = match[1]
        ? match[1].split(",").map((n) => n.trim().split(" as ")[0].trim()).filter(Boolean)
        : [match[2]!];
      imports.push({ from: match[3], names, line: i + 1 });
    }
  }
  return imports;
}

/** Check if an import path resolves to a generated file, template file, or npm package */
function resolveImport(
  importPath: string,
  fromFile: string,
  generatedPaths: Set<string>,
): "generated" | "template" | "npm" | "MISSING" {
  // npm packages (no relative path)
  if (!importPath.startsWith(".")) return "npm";

  // Resolve relative path
  const fromDir = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : "";
  const parts = importPath.split("/");
  let resolved = fromDir;

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      resolved = resolved.includes("/") ? resolved.slice(0, resolved.lastIndexOf("/")) : "";
      continue;
    }
    resolved = resolved ? `${resolved}/${part}` : part;
  }

  // Try common extensions
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}/index.ts`,
    `${resolved}/index.tsx`,
  ];

  for (const candidate of candidates) {
    if (generatedPaths.has(candidate) || TEMPLATE_FILES.has(candidate)) {
      return generatedPaths.has(candidate) ? "generated" : "template";
    }
  }

  return "MISSING";
}

interface QualityCheck {
  name: string;
  severity: "error" | "warning" | "info";
  file?: string;
  line?: number;
  detail: string;
}

function analyzeSession(session: Session, files: GeneratedFile[]): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const generatedPaths = new Set(files.map((f) => f.path));

  // ------ 1. Missing import resolution ------
  for (const file of files) {
    if (!file.path.endsWith(".ts") && !file.path.endsWith(".tsx")) continue;
    const imports = extractImports(file.contents);
    for (const imp of imports) {
      const resolution = resolveImport(imp.from, file.path, generatedPaths);
      if (resolution === "MISSING") {
        checks.push({
          name: "phantom-import",
          severity: "error",
          file: file.path,
          line: imp.line,
          detail: `Imports { ${imp.names.join(", ")} } from "${imp.from}" — file does NOT exist in template or generated files`,
        });
      }
    }
  }

  // ------ 2. CSS class usage checks ------
  for (const file of files) {
    if (!file.path.endsWith(".tsx")) continue;

    // Plain white backgrounds
    if (/bg-white(?!\/)/.test(file.contents) && !file.contents.includes("bg-gradient")) {
      checks.push({
        name: "plain-white-bg",
        severity: "warning",
        file: file.path,
        detail: "Uses bg-white without gradients — looks flat. Should use bg-gradient-to-* or var(--color-surface)",
      });
    }

    // Raw <button> without className
    if (/<button(?:\s+(?!className)[^>]*)?>/.test(file.contents)) {
      // Only flag if there's a button tag without className at all
      const buttonMatches = file.contents.match(/<button[^>]*>/g) || [];
      const unstyled = buttonMatches.filter((b) => !b.includes("className"));
      if (unstyled.length > 0) {
        checks.push({
          name: "unstyled-button",
          severity: "warning",
          file: file.path,
          detail: `${unstyled.length} raw <button> without className — should use Button component or Tailwind classes`,
        });
      }
    }

    // Emoji used as icons (common anti-pattern)
    const emojiMatches = file.contents.match(/["'>`][\u{1F300}-\u{1FAF8}]/gu);
    if (emojiMatches && emojiMatches.length > 3) {
      checks.push({
        name: "emoji-as-icons",
        severity: "warning",
        file: file.path,
        detail: `${emojiMatches.length} emoji characters found — consider lucide-react icons for professional look`,
      });
    }

    // No motion/animation usage
    if (!file.contents.includes("motion") && !file.contents.includes("animate-") && !file.contents.includes("transition-")) {
      checks.push({
        name: "no-animations",
        severity: "warning",
        file: file.path,
        detail: "No motion library or CSS animations used — app will feel static",
      });
    }

    // Touch target check (min 44px)
    if (file.contents.includes("<button") && !file.contents.includes("min-h-[44px]") && !file.contents.includes("min-h-[") && !file.contents.includes("h-9") && !file.contents.includes("h-10") && !file.contents.includes("h-11") && !file.contents.includes("h-12")) {
      checks.push({
        name: "small-touch-targets",
        severity: "info",
        file: file.path,
        detail: "Buttons may not meet 44px minimum touch target for therapy tools",
      });
    }
  }

  // ------ 3. Structural checks ------
  const hasAppTsx = generatedPaths.has("src/App.tsx");
  if (!hasAppTsx) {
    checks.push({
      name: "missing-app-tsx",
      severity: "error",
      file: undefined,
      detail: "No src/App.tsx generated — app will show placeholder",
    });
  }

  const fileCount = files.length;
  if (fileCount === 1) {
    checks.push({
      name: "single-file",
      severity: "warning",
      file: undefined,
      detail: "Only 1 file generated — complex apps need multi-file architecture (types, data, components, App)",
    });
  }

  // ------ 4. Code size checks ------
  for (const file of files) {
    const lines = file.contents.split("\n").length;
    if (lines > 500) {
      checks.push({
        name: "large-file",
        severity: "warning",
        file: file.path,
        detail: `${lines} lines — consider splitting into smaller components`,
      });
    }
  }

  // ------ 5. Design token usage ------
  for (const file of files) {
    if (!file.path.endsWith(".tsx")) continue;
    const usesDesignTokens = file.contents.includes("var(--color-");
    const usesRawColors = /(?:text|bg|border)-(?:red|blue|green|yellow|purple|pink|orange)-\d/.test(file.contents);
    if (usesRawColors && !usesDesignTokens) {
      checks.push({
        name: "raw-colors",
        severity: "info",
        file: file.path,
        detail: "Uses raw Tailwind colors instead of design tokens (--color-primary, --color-accent, etc.)",
      });
    }
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Report formatter
// ---------------------------------------------------------------------------

function printReport(session: Session, files: GeneratedFile[], checks: QualityCheck[]) {
  const errors = checks.filter((c) => c.severity === "error");
  const warnings = checks.filter((c) => c.severity === "warning");
  const infos = checks.filter((c) => c.severity === "info");

  const score = Math.max(0, 100 - errors.length * 20 - warnings.length * 5 - infos.length * 1);

  console.log("\n" + "═".repeat(80));
  console.log(`SESSION: ${session._id}`);
  console.log(`TITLE:   ${session.title}`);
  console.log(`PROMPT:  ${session.query?.slice(0, 100)}${(session.query?.length ?? 0) > 100 ? "..." : ""}`);
  console.log(`STATE:   ${session.state}`);
  console.log(`DATE:    ${new Date(session._creationTime).toLocaleString()}`);
  console.log(`FILES:   ${files.length} generated`);
  files.forEach((f) => {
    const lines = f.contents.split("\n").length;
    console.log(`         ${f.path} (${lines} lines, v${f.version})`);
  });
  console.log("─".repeat(80));

  // Quality score
  const scoreColor = score >= 80 ? "\x1b[32m" : score >= 50 ? "\x1b[33m" : "\x1b[31m";
  console.log(`\nQUALITY SCORE: ${scoreColor}${score}/100\x1b[0m  (${errors.length} errors, ${warnings.length} warnings, ${infos.length} info)`);

  // Issues
  if (errors.length > 0) {
    console.log("\n\x1b[31m❌ ERRORS (app likely broken)\x1b[0m");
    for (const c of errors) {
      const loc = c.file ? `${c.file}${c.line ? `:${c.line}` : ""}` : "(session)";
      console.log(`   [${c.name}] ${loc}`);
      console.log(`   → ${c.detail}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\n\x1b[33m⚠ WARNINGS (looks unprofessional)\x1b[0m");
    for (const c of warnings) {
      const loc = c.file ? `${c.file}${c.line ? `:${c.line}` : ""}` : "(session)";
      console.log(`   [${c.name}] ${loc}`);
      console.log(`   → ${c.detail}`);
    }
  }

  if (infos.length > 0) {
    console.log("\n\x1b[36mℹ INFO (polish opportunities)\x1b[0m");
    for (const c of infos) {
      const loc = c.file ? `${c.file}${c.line ? `:${c.line}` : ""}` : "(session)";
      console.log(`   [${c.name}] ${loc}`);
      console.log(`   → ${c.detail}`);
    }
  }

  // Import dependency graph
  console.log("\n" + "─".repeat(80));
  console.log("IMPORT GRAPH:");
  for (const file of files) {
    if (!file.path.endsWith(".ts") && !file.path.endsWith(".tsx")) continue;
    const imports = extractImports(file.contents);
    if (imports.length === 0) continue;
    console.log(`  ${file.path}:`);
    const generatedPaths = new Set(files.map((f) => f.path));
    for (const imp of imports) {
      const resolution = resolveImport(imp.from, file.path, generatedPaths);
      const icon = resolution === "MISSING" ? "❌" : resolution === "npm" ? "📦" : resolution === "generated" ? "✅" : "📄";
      console.log(`    ${icon} ${imp.from} → { ${imp.names.join(", ")} } [${resolution}]`);
    }
  }

  console.log("\n" + "═".repeat(80) + "\n");
  return score;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];

  let sessions: Session[];

  if (arg === "--all") {
    sessions = convexRun("sessions:list") as Session[];
  } else if (arg === "--last") {
    const n = parseInt(process.argv[3] ?? "5", 10);
    const all = convexRun("sessions:list") as Session[];
    sessions = all.slice(0, n);
  } else if (arg) {
    const session = convexRun("sessions:get", { sessionId: arg }) as Session | null;
    if (!session) {
      console.error(`Session not found: ${arg}`);
      process.exit(1);
    }
    sessions = [session];
  } else {
    // Most recent session
    const all = convexRun("sessions:list") as Session[];
    if (all.length === 0) {
      console.error("No sessions found");
      process.exit(1);
    }
    sessions = [all[0]];
  }

  console.log(`\nAnalyzing ${sessions.length} session(s)...\n`);

  let totalScore = 0;
  const sessionScores: Array<{ title: string; score: number; errors: number }> = [];

  for (const session of sessions) {
    const files = convexRun("generated_files:list", { sessionId: session._id }) as GeneratedFile[];
    if (files.length === 0) {
      console.log(`⏭ Skipping session "${session.title}" (no generated files)`);
      continue;
    }

    const checks = analyzeSession(session, files);
    const score = printReport(session, files, checks);
    totalScore += score;
    sessionScores.push({
      title: session.title,
      score,
      errors: checks.filter((c) => c.severity === "error").length,
    });
  }

  // Summary if multiple sessions
  if (sessionScores.length > 1) {
    console.log("═".repeat(80));
    console.log("SUMMARY ACROSS SESSIONS");
    console.log("─".repeat(80));
    const avg = Math.round(totalScore / sessionScores.length);
    console.log(`Average quality score: ${avg}/100`);
    console.log(`Sessions with errors:  ${sessionScores.filter((s) => s.errors > 0).length}/${sessionScores.length}`);
    console.log("");
    for (const s of sessionScores) {
      const icon = s.score >= 80 ? "✅" : s.score >= 50 ? "⚠️" : "❌";
      console.log(`  ${icon} ${s.score}/100  ${s.title}`);
    }
    console.log("═".repeat(80));
  }
}

main().catch((err) => {
  console.error("Analysis failed:", err);
  process.exit(1);
});
