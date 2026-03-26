import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import * as esbuild from "esbuild";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { cp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { extractErrorMessage, settleInBatches } from "@/core/utils";
import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
import { createAgentTools } from "@/features/builder/lib/agent-tools";
// Design review pass removed — main prompt has extensive design rules already
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";
import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "./sse";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonErrorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Try Clerk auth if available, but don't block generation
  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (clerkUserId) {
      const token = await getToken({ template: "convex" });
      if (token) convex.setAuth(token);
    }
  } catch {
    // Auth not configured yet — allow unauthenticated generation for demo
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErrorResponse("Invalid JSON", 400);
  }

  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  }

  const ip = request.headers.get("x-real-ip")
      ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "anonymous";
  try {
    await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
  } catch (e) {
    return jsonErrorResponse(e instanceof Error ? e.message : "Rate limited", 429);
  }

  const query = parsed.data.query ?? parsed.data.prompt!;
  const mode = parsed.data.mode;
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;

  const sessionId: Id<"sessions"> =
    providedSessionId ??
    (await convex.mutation(api.sessions.create, {
      title: query.slice(0, 60),
      query,
    }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventType: string, data: object) => {
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {
          // Client disconnected — normal for tab close, navigation away, etc.
        }
      };

      let buildDir: string | undefined;
      let buildSucceeded = false;

      try {
        send("session", { sessionId });

        if (!providedSessionId) {
          await convex.mutation(api.messages.create, {
            sessionId,
            role: "user",
            content: query,
            timestamp: Date.now(),
          });
        }

        await convex.mutation(api.sessions.startGeneration, { sessionId });
        send("status", { status: "generating" });
        send("activity", { type: "thinking", message: "Understanding your request..." });

        const isFlashcardMode = mode === "flashcards";
        const systemPrompt = isFlashcardMode
          ? buildFlashcardSystemPrompt()
          : buildSystemPrompt();

        const collectedFiles = new Map<string, string>();

        if (!isFlashcardMode) {
          // Copy WAB scaffold to temp dir for this build
          buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
          await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
        }

        const tools = isFlashcardMode
          ? createFlashcardTools({ send, sessionId, convex })
          : createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });

        // Generation pass — tool runner handles the multi-turn loop automatically
        const runner = anthropic.beta.messages.toolRunner({
          model: "claude-sonnet-4-6",
          max_tokens: isFlashcardMode ? 4096 : 32768,
          system: systemPrompt,
          tools,
          messages: [{ role: "user", content: query }],
          stream: true,
          max_iterations: 10,
        });

        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send("token", { token: event.delta.text });
            }
          }
        }

        if (!isFlashcardMode) {
          // Bundle with esbuild (builder mode only — flashcards don't need bundling)
          if (buildDir && collectedFiles.size > 0) {
            send("status", { status: "bundling" });
            send("activity", { type: "thinking", message: "Bundling your app..." });

            try {
              // esbuild bundles JS/TSX; Tailwind CDN handles CSS at runtime in the browser.
              // This replaces the Parcel+html-inline pipeline which was too large for Vercel (367MB).
              const entryPoint = join(buildDir!, "src", "main.tsx");
              console.log(`[generate] esbuild: entryPoint=${entryPoint} exists=${existsSync(entryPoint)} buildDir=${buildDir}`);
              if (!existsSync(entryPoint)) throw new Error("Scaffold entry point src/main.tsx not found");

              // Resolve from scaffold's prod deps AND root node_modules (for shared packages)
              const nodePaths = [
                join(buildDir!, "node_modules"),
                join(process.cwd(), "node_modules"),
              ].filter(existsSync);

              const result = await esbuild.build({
                entryPoints: [entryPoint],
                bundle: true,
                format: "esm",
                target: ["chrome100"],
                outdir: join(buildDir!, "dist"),
                jsx: "automatic",
                loader: { ".tsx": "tsx", ".ts": "ts", ".jsx": "jsx", ".js": "js" },
                minify: true,
                sourcemap: false,
                nodePaths,
                // Treat CSS imports as empty — actual CSS is injected via Tailwind CDN in the HTML
                plugins: [{
                  name: "ignore-css",
                  setup(build) {
                    build.onResolve({ filter: /\.css$/ }, () => ({
                      path: "css-ignored",
                      namespace: "ignore",
                    }));
                    build.onLoad({ filter: /.*/, namespace: "ignore" }, () => ({
                      contents: "",
                      loader: "js",
                    }));
                  },
                }],
                // Resolve @/* path aliases via tsconfigRaw (avoids plugin API issues on Vercel)
                tsconfigRaw: JSON.stringify({
                  compilerOptions: {
                    baseUrl: buildDir!,
                    paths: { "@/*": ["./src/*"] },
                    jsx: "react-jsx",
                  },
                }),
                logLevel: "warning",
              });

              if (result.errors.length > 0) {
                throw new Error(`esbuild errors: ${result.errors.map(e => e.text).join("; ")}`);
              }
              send("activity", { type: "thinking", message: "Compiled successfully, assembling preview..." });

              // Read the bundled JS
              const jsBundle = readFileSync(join(buildDir!, "dist", "main.js"), "utf-8");

              // Read the scaffold CSS — strip build-time directives, keep everything as regular CSS
              const cssPath = join(buildDir!, "src", "index.css");
              const rawCss = existsSync(cssPath) ? readFileSync(cssPath, "utf-8") : "";
              const processedCss = rawCss
                // Strip @tailwind directives (CDN handles base/components/utilities)
                .replace(/@tailwind\s+(?:base|components|utilities)\s*;/g, "")
                // Convert @apply directives to equivalent regular CSS
                // (CDN can't process @apply — it's a build-time Tailwind feature)
                .replace(/@apply\s+border-border\s*;/g, "border-color: hsl(var(--border));")
                .replace(/@apply\s+bg-background\s+text-foreground\s*;/g,
                  "background-color: hsl(var(--background)); color: hsl(var(--foreground));")
                // Strip any remaining @apply (fallback — expand common patterns)
                .replace(/@apply\s+[^;]+;/g, "/* @apply stripped */")
                // Unwrap :root and .dark from @layer base — CDN manages its own layers
                .replace(/@layer\s+base\s*\{\s*(:root\s*\{[\s\S]*?\})\s*\}/g, "$1")
                .replace(/@layer\s+base\s*\{\s*(\.dark\s*\{[\s\S]*?\})\s*\}/g, "$1")
                // Remove empty/inert @layer base blocks (left after @apply stripping)
                .replace(/@layer\s+base\s*\{[\s\S]*?\}/g, (match) =>
                  match.replace(/\/\*[^*]*\*\//g, "").replace(/\s/g, "").length <= "@layerbase{}".length ? "" : match)
                .trim();
              send("activity", { type: "thinking", message: "Processing styles..." });

              // Read tailwind.config.js for CDN inline config
              const twConfigPath = join(buildDir!, "tailwind.config.js");
              const twConfigRaw = existsSync(twConfigPath) ? readFileSync(twConfigPath, "utf-8") : "";
              // Extract the full theme.extend object with balanced brace matching
              let twExtend = "{}";
              const extendIdx = twConfigRaw.indexOf("extend:");
              if (extendIdx !== -1) {
                let start = -1;
                let depth = 0;
                for (let i = extendIdx + 7; i < twConfigRaw.length; i++) {
                  if (twConfigRaw[i] === "{") { if (start === -1) start = i; depth++; }
                  else if (twConfigRaw[i] === "}") {
                    depth--;
                    if (depth === 0 && start !== -1) {
                      twExtend = twConfigRaw.slice(start, i + 1);
                      break;
                    }
                  }
                }
              }

              // Inlined tailwindcss-animate CSS — CDN can't load Node plugins via require()
              const animateCss = `
@keyframes enter { from { opacity: var(--tw-enter-opacity, 1); transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0)); } }
@keyframes exit { to { opacity: var(--tw-exit-opacity, 1); transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0)); } }
.animate-in { animation: enter 150ms; }
.animate-out { animation: exit 150ms; }
.fade-in, .fade-in-0 { --tw-enter-opacity: 0; }
.fade-out, .fade-out-0 { --tw-exit-opacity: 0; }
.fade-out-80 { --tw-exit-opacity: 0.8; }
.zoom-in-90 { --tw-enter-scale: 0.9; }
.zoom-in-95 { --tw-enter-scale: 0.95; }
.zoom-out-95 { --tw-exit-scale: 0.95; }
.slide-in-from-top { --tw-enter-translate-y: -100%; }
.slide-in-from-top-2 { --tw-enter-translate-y: -0.5rem; }
.slide-in-from-top-full { --tw-enter-translate-y: -100%; }
.slide-in-from-top-\\[48\\%\\] { --tw-enter-translate-y: -48%; }
.slide-in-from-bottom { --tw-enter-translate-y: 100%; }
.slide-in-from-bottom-2 { --tw-enter-translate-y: 0.5rem; }
.slide-in-from-bottom-full { --tw-enter-translate-y: 100%; }
.slide-in-from-left { --tw-enter-translate-x: -100%; }
.slide-in-from-left-2 { --tw-enter-translate-x: -0.5rem; }
.slide-in-from-left-1\\/2 { --tw-enter-translate-x: -50%; }
.slide-in-from-left-52 { --tw-enter-translate-x: -13rem; }
.slide-in-from-right { --tw-enter-translate-x: 100%; }
.slide-in-from-right-2 { --tw-enter-translate-x: 0.5rem; }
.slide-in-from-right-52 { --tw-enter-translate-x: 13rem; }
.slide-out-to-top { --tw-exit-translate-y: -100%; }
.slide-out-to-top-\\[48\\%\\] { --tw-exit-translate-y: -48%; }
.slide-out-to-bottom { --tw-exit-translate-y: 100%; }
.slide-out-to-left { --tw-exit-translate-x: -100%; }
.slide-out-to-left-1\\/2 { --tw-exit-translate-x: -50%; }
.slide-out-to-left-52 { --tw-exit-translate-x: -13rem; }
.slide-out-to-right { --tw-exit-translate-x: 100%; }
.slide-out-to-right-52 { --tw-exit-translate-x: 13rem; }
.slide-out-to-right-full { --tw-exit-translate-x: 100%; }`;

              // Assemble self-contained HTML
              const bundleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.tailwindcss.com;" />
  <script>window.tailwind = { config: { darkMode: ["class"], theme: { extend: ${twExtend} } } };</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${processedCss}</style>
  <style>${animateCss}</style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" />
  <title>Bridges App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module">${jsBundle}</script>
</body>
</html>`;

              console.log(`[generate] esbuild bundle assembled: ${jsBundle.length} chars JS, ${processedCss.length} chars CSS, ${bundleHtml.length} chars total HTML`);
              if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");
              send("activity", { type: "thinking", message: "Almost ready..." });
              send("bundle", { html: bundleHtml });
              buildSucceeded = true;
              console.log("[generate] bundle SSE event sent, buildSucceeded=true");
              // Persist bundle for session resume
              try {
                await convex.mutation(api.generated_files.upsertAutoVersion, {
                  sessionId,
                  path: "_bundle.html",
                  contents: bundleHtml,
                });
              } catch (err) {
                console.error("[generate] Failed to persist bundle:", err);
                send("activity", { type: "thinking", message: "Warning: app may not load on resume" });
              }
            } catch (buildError) {
              const errMsg = buildError instanceof Error ? buildError.message : String(buildError);
              console.error("[generate] esbuild bundle failed:", errMsg.slice(0, 1000));
              send("activity", { type: "complete", message: `Build failed: ${errMsg.slice(0, 200)}` });
              // buildSucceeded stays false — done event will carry buildFailed: true
            }
          }
        }

        // Convert Map to array for persistence and done event
        const fileArray = [...collectedFiles.entries()].map(([path, contents]) => ({
          path,
          contents,
        }));

        // Persist files in batches of 10 — prevents rate limit overload
        const mutationThunks = fileArray.map(
          ({ path, contents }) =>
            () =>
              convex.mutation(api.generated_files.upsertAutoVersion, {
                sessionId,
                path,
                contents,
              }),
        );
        const settled =
          mutationThunks.length <= 20
            ? await Promise.allSettled(mutationThunks.map((fn) => fn()))
            : await settleInBatches(mutationThunks, 10);
        const failures = settled.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error(`[generate] ${failures.length} file persistence failure(s)`);
        }

        const postLlmPromises: Promise<unknown>[] = [];

        // Persist a friendly summary instead of raw Claude reasoning text
        if (fileArray.length > 0) {
          const friendlyMsg = `I built your app with ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}. ${buildSucceeded ? "It's ready to use!" : "Check the preview for details."}`;
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "assistant",
              content: friendlyMsg,
              timestamp: Date.now(),
            }),
          );
        }

        if (fileArray.length > 0) {
          const fileList = fileArray.map((f) => f.path).join(", ");
          postLlmPromises.push(
            convex.mutation(api.messages.create, {
              sessionId,
              role: "system",
              content: `Built ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}: ${fileList}`,
              timestamp: Date.now(),
            }),
          );
        }

        // Persist messages — failures don't prevent going live
        await Promise.allSettled(postLlmPromises);
        // Always transition to live
        await convex.mutation(api.sessions.setLive, { sessionId });

        send("activity", {
          type: "complete",
          message: buildSucceeded ? "App is live and ready!" : "Code generated — preview build had issues",
        });
        send("status", { status: "live" });
        send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });
      } catch (error) {
        console.error("[generate] Error:", error instanceof Error ? error.stack : error);

        try {
          await convex.mutation(api.sessions.setFailed, {
            sessionId,
            error: extractErrorMessage(error),
          });
        } catch (persistError) {
          console.error("[generate] Failed to persist error state:", persistError);
        }

        send("error", { message: "Generation failed — please try again" });
      } finally {
        if (buildDir) {
          try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
