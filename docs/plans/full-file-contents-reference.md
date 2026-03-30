# Full File Contents Reference with Line Numbers

## File 1: src/app/api/generate/route.ts

Full file content (315 lines):

```typescript
     1  import Anthropic from "@anthropic-ai/sdk";
     2  import { auth } from "@clerk/nextjs/server";
     3  import { exec } from "child_process";
     4  import { ConvexHttpClient } from "convex/browser";
     5  import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
     6  import { cp } from "fs/promises";
     7  import { tmpdir } from "os";
     8  import { join } from "path";
     9  import { promisify } from "util";
    10
    11  import { extractErrorMessage, settleInBatches } from "@/core/utils";
    12  import { buildSystemPrompt } from "@/features/builder/lib/agent-prompt";
    13  import { createAgentTools } from "@/features/builder/lib/agent-tools";
    14  import { buildReviewMessages, DESIGN_REVIEW_PROMPT } from "@/features/builder/lib/review-prompt";
    15  import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";
    16  import { buildFlashcardSystemPrompt } from "@/features/flashcards/lib/flashcard-prompt";
    17  import { createFlashcardTools } from "@/features/flashcards/lib/flashcard-tools";
    18
    19  import { api } from "../../../../convex/_generated/api";
    20  import type { Id } from "../../../../convex/_generated/dataModel";
    21  import { sseEncode } from "./sse";
    22
    23  const execAsync = promisify(exec);
    24
    25  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    26    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate");
    27  }
    28  if (!process.env.ANTHROPIC_API_KEY) {
    29    throw new Error("ANTHROPIC_API_KEY is required for /api/generate");
    30  }
    31
    32  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    33
    34  const anthropic = new Anthropic({
    35    apiKey: process.env.ANTHROPIC_API_KEY,
    36  });
    37
    38  export const runtime = "nodejs";
    39
    40  // ---------------------------------------------------------------------------
    41  // Helpers
    42  // ---------------------------------------------------------------------------
    43
    44  function jsonErrorResponse(message: string, status: number): Response {
    45    return new Response(JSON.stringify({ error: message }), {
    46      status,
    47      headers: { "Content-Type": "application/json" },
    48    });
    49  }
    50
    51  // ---------------------------------------------------------------------------
    52  // Route handler
    53  // ---------------------------------------------------------------------------
    54
    55  export async function POST(request: Request): Promise<Response> {
    56    // Authenticate via Clerk and forward JWT to Convex
    57    const { userId, getToken } = await auth();
    58    if (!userId) return jsonErrorResponse("Unauthorized", 401);
    59    const token = await getToken({ template: "convex" });
    60    if (token) convex.setAuth(token);
    61
    62    let body: unknown;
    63    try {
    63    body = await request.json();
    64    } catch {
    65      return jsonErrorResponse("Invalid JSON", 400);
    66    }
    67
    68    const parsed = GenerateInputSchema.safeParse(body);
    69    if (!parsed.success) {
    70      return jsonErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    71    }
    72
    73    const ip = request.headers.get("x-real-ip")
    74        ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    75        ?? "anonymous";
    76    try {
    77      await convex.mutation(api.rate_limit_check.checkGenerateLimit, { key: ip });
    78    } catch (e) {
    79      return jsonErrorResponse(e instanceof Error ? e.message : "Rate limited", 429);
    80    }
    81
    82    const query = parsed.data.query ?? parsed.data.prompt!;
    83    const mode = parsed.data.mode;
    84    const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;
    85
    86    const sessionId: Id<"sessions"> =
    87      providedSessionId ??
    88      (await convex.mutation(api.sessions.create, {
    89        title: query.slice(0, 60),
    90        query,
    91      }));
    92
    93    const encoder = new TextEncoder();
    94    const stream = new ReadableStream({
    95      async start(controller) {
    96        const send = (eventType: string, data: object) => {
    97          try {
    98            controller.enqueue(encoder.encode(sseEncode(eventType, data)));
    99          } catch {
   100            // Client disconnected — normal for tab close, navigation away, etc.
   101          }
   102        };
   103
   104        let buildDir: string | undefined;
   105        let buildSucceeded = false;
   106
   107        try {
   108          send("session", { sessionId });
   109
   110          if (!providedSessionId) {
   111            await convex.mutation(api.messages.create, {
   112              sessionId,
   113              role: "user",
   114              content: query,
   115              timestamp: Date.now(),
   116            });
   117          }
   118
   119          await convex.mutation(api.sessions.startGeneration, { sessionId });
   120          send("status", { status: "generating" });
   121          send("activity", { type: "thinking", message: "Understanding your request..." });
   122
   123          const isFlashcardMode = mode === "flashcards";
   124          const systemPrompt = isFlashcardMode
   125            ? buildFlashcardSystemPrompt()
   126            : buildSystemPrompt();
   127
   128          const collectedFiles = new Map<string, string>();
   129          let assistantText = "";
   130
   131          if (!isFlashcardMode) {
   132            // Copy WAB scaffold to temp dir for this build
   133            buildDir = mkdtempSync(join(tmpdir(), "bridges-build-"));
   134            await cp(join(process.cwd(), "artifacts/wab-scaffold"), buildDir, { recursive: true });
   135          }
   136
   137          const tools = isFlashcardMode
   138            ? createFlashcardTools({ send, sessionId, convex })
   139            ? createAgentTools({ send, sessionId, collectedFiles, convex, buildDir: buildDir! });
   140
   141          // Generation pass — tool runner handles the multi-turn loop automatically
   142          const runner = anthropic.beta.messages.toolRunner({
   143            model: "claude-sonnet-4-6",
   144            max_tokens: isFlashcardMode ? 4096 : 32768,
   145            system: systemPrompt,
   146            tools,
   147            messages: [{ role: "user", content: query }],
   148            stream: true,
   149            max_iterations: 10,
   150          });
   151
   152          for await (const messageStream of runner) {
   153            for await (const event of messageStream) {
   154              if (
   155                event.type === "content_block_delta" &&
   156                event.delta.type === "text_delta"
   157              ) {
   158                assistantText += event.delta.text;
   159                send("token", { token: event.delta.text });
   160              }
   161            }
   162          }
   163
   164          if (!isFlashcardMode) {
   165            // Design review pass — re-check generated files for visual polish
   166            if (collectedFiles.size > 0) {
   167              send("activity", { type: "thinking", message: "Polishing design..." });
   168              const reviewTools = tools.filter(t => t.name === "write_file");
   169              const reviewRunner = anthropic.beta.messages.toolRunner({
   169                model: "claude-sonnet-4-6",
   170                max_tokens: 8192,
   171                system: DESIGN_REVIEW_PROMPT,
   172                tools: reviewTools,
   173                messages: buildReviewMessages(collectedFiles),
   174                stream: true,
   175                max_iterations: 3,
   176              });
   177              for await (const messageStream of reviewRunner) {
   178                for await (const event of messageStream) {
   179                  if (
   180                    event.type === "content_block_delta" &&
   181                    event.delta.type === "text_delta"
   182                  ) {
   183                    send("token", { token: event.delta.text });
   184                  }
   185                }
   186              }
   187            }
   188
   189            // Bundle with Parcel
   190            if (collectedFiles.size > 0) {
   191              send("status", { status: "bundling" });
   192              send("activity", { type: "thinking", message: "Bundling your app..." });
   193
   194              try {
   195                // Parcel build + custom inliner (html-inline breaks on external URLs)
   196                await execAsync(
   197                  "pnpm exec parcel build index.html --no-source-maps --dist-dir dist && node scripts/inline-bundle.cjs dist/index.html bundle.html",
   197                  { cwd: buildDir, timeout: 30000 },
   198                );
   199                const bundlePath = join(buildDir!, "bundle.html");
   200                if (!existsSync(bundlePath)) throw new Error("Parcel produced no bundle.html");
   201                const bundleHtml = readFileSync(bundlePath, "utf-8");
   202                if (bundleHtml.length < 100) throw new Error("bundle.html is suspiciously small");
   203                send("bundle", { html: bundleHtml });
   204                buildSucceeded = true;
   205                // Persist bundle for session resume
   206                try {
   206                  await convex.mutation(api.generated_files.upsertAutoVersion, {
   207                    sessionId,
   208                    path: "_bundle.html",
   209                    contents: bundleHtml,
   210                  });
   211                } catch (err) {
   212                  console.error("[generate] Failed to persist bundle:", err);
   213                  send("activity", { type: "thinking", message: "Warning: app may not load on resume" });
   214                }
   215              } catch (buildError) {
   216                console.error("[generate] Parcel build failed:", buildError);
   216                send("activity", { type: "complete", message: "Build failed — check the Code panel for your files" });
   217                // Don't throw — still persist files and send done event
   218              }
   219            }
   220          }
   221
   222          // Convert Map to array for persistence and done event
   223          const fileArray = [...collectedFiles.entries()].map(([path, contents]) => ({
   224            path,
   225            contents,
   226          }));
   227
   228          // Persist files in batches of 10 — prevents rate limit overload
   229          const mutationThunks = fileArray.map(
   230            ({ path, contents }) =>
   231              () =>
   232                convex.mutation(api.generated_files.upsertAutoVersion, {
   233                  sessionId,
   234                  path,
   235                  contents,
   236                }),
   237          );
   238          const settled =
   239            mutationThunks.length <= 20
   240              ? await Promise.allSettled(mutationThunks.map((fn) => fn()))
   241              : await settleInBatches(mutationThunks, 10);
   242          const failures = settled.filter((r) => r.status === "rejected");
   243          if (failures.length > 0) {
   243            console.error(`[generate] ${failures.length} file persistence failure(s)`);
   244          }
   245
   246          const postLlmPromises: Promise<unknown>[] = [];
   247
   248          if (assistantText.trim()) {
   249            postLlmPromises.push(
   250              convex.mutation(api.messages.create, {
   251                sessionId,
   252                role: "assistant",
   253                content: assistantText.trim(),
   254                timestamp: Date.now(),
   255              }),
   256            );
   257          }
   258
   259          if (fileArray.length > 0) {
   260            const fileList = fileArray.map((f) => f.path).join(", ");
   261            postLlmPromises.push(
   262              convex.mutation(api.messages.create, {
   263                sessionId,
   264                role: "system",
   265                content: `Built ${fileArray.length} file${fileArray.length > 1 ? "s" : ""}: ${fileList}`,
   266                timestamp: Date.now(),
   267              }),
   268            );
   269          }
   270
   271          // Persist messages — failures don't prevent going live
   272          await Promise.allSettled(postLlmPromises);
   273          // Always transition to live
   274          await convex.mutation(api.sessions.setLive, { sessionId });
   275
   276          send("activity", { type: "complete", message: "App is ready!" });
   277          send("status", { status: "live" });
   278          send("done", { sessionId, files: fileArray, buildFailed: !buildSucceeded && collectedFiles.size > 0 });
   279        } catch (error) {
       280          console.error("[generate] Error:", error instanceof Error ? error.stack : error);
       281
       282          try {
       283            await convex.mutation(api.sessions.setFailed, {
       284              sessionId,
       285              error: extractErrorMessage(error),
       286            });
       287          } catch (persistError) {
       288            console.error("[generate] Failed to persist error state:", persistError);
       289          }
       290
       291          send("error", { message: "Generation failed — please try again" });
       292        } finally {
       293          if (buildDir) {
       294            try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
       295          }
       296          controller.close();
       297        }
       298      },
       299    });
       300
       301    return new Response(stream, {
       302      headers: {
       303        "Content-Type": "text/event-stream",
       304        "Cache-Control": "no-cache",
       305        Connection: "keep-alive",
       306      },
       307    });
       308  }
```

**CRITICAL LINES:**
- Line 104-105: `buildDir` declaration and `buildSucceeded` initialization
- Line 131-135: Conditional buildDir creation (builder mode only)
- Line 139: **Non-null assertion** `buildDir!`
- Line 190-191: Parcel block condition
- Line 194-218: **ISSUE #1** — Parcel try-catch (errors swallowed)
- Line 215-217: Catch block logs but doesn't track failure properly
- Line 274-278: **ISSUE #4** — "done" event with incorrect buildFailed logic

---

## File 2: src/features/builder/hooks/use-streaming.ts

Full file content (347 lines):

```typescript
     1  "use client";
     2
     3  import { useCallback, useEffect, useRef, useState } from "react";
     4
     5  import { parseSSEChunks } from "@/core/sse-utils";
     6  import { extractErrorMessage } from "@/core/utils";
     7  import { type TherapyBlueprint,TherapyBlueprintSchema } from "@/features/builder/lib/schemas";
     8  import { parseSSEEvent,type SSEEvent } from "@/features/builder/lib/sse-events";
     9
    10  export type StreamingStatus = "idle" | "generating" | "live" | "failed";
    11
    12  export interface StreamingFile {
    13    path: string;
    14    contents: string;
    15    version?: number;
    16  }
    17
    18  export interface Activity {
    19    id: string;
    20    type: "thinking" | "writing_file" | "file_written" | "complete";
    21    message: string;
    22    path?: string;
    23    timestamp: number;
    24  }
    25
    26  export interface ResumeSessionArgs {
    27    sessionId: string;
    28    files: StreamingFile[];
    29    blueprint?: TherapyBlueprint | null;
    30    bundleHtml?: string | null;
    31  }
    32
    33  export interface UseStreamingReturn {
    34    status: StreamingStatus;
    35    files: StreamingFile[];
    36    generate: (prompt: string) => Promise<void>;
    37    resumeSession: (args: ResumeSessionArgs) => void;
    38    blueprint: TherapyBlueprint | null;
    39    appName: string | null;
    40    error: string | null;
    41    sessionId: string | null;
    42    streamingText: string;
    43    activities: Activity[];
    44    bundleHtml: string | null;
    45    reset: () => void;
    46  }
    47
    48  export interface UseStreamingOptions {
    49    onFileComplete?: (path: string, contents: string) => Promise<void>;
    50    onBundle?: (html: string) => void;
    51  }
    52
    53
    54  export function useStreaming(options?: UseStreamingOptions): UseStreamingReturn {
    55    const [status, setStatus] = useState<StreamingStatus>("idle");
    56    const [files, setFiles] = useState<StreamingFile[]>([]);
    57    const [blueprint, setBlueprint] = useState<TherapyBlueprint | null>(null);
    58    const [status, setAppName] = useState<string | null>(null);
    59    const [error, setError] = useState<string | null>(null);
    59    const [sessionId, setSessionId] = useState<string | null>(null);
    60    const [streamingText, setStreamingText] = useState("");
    61    const [activities, setActivities] = useState<Activity[]>([]);
    62    const [bundleHtml, setBundleHtml] = useState<string | null>(null);
    63
    64    const reset = () => {
    65      abortRef.current?.abort();
    66      setStatus("idle");
    67      setFiles([]);
    68      setBlueprint(null);
    69      setAppName(null);
    70      setError(null);
    71      setSessionId(null);
    71      setStreamingText("");
    72      setActivities([]);
    73      setBundleHtml(null);
    74    };
    75
    76    const abortRef = useRef<AbortController | null>(null);
    77    const onFileCompleteRef = useRef(options?.onFileComplete);
    77    const onBundleRef = useRef(options?.onBundle);
    78    const activityCounterRef = useRef(0);
    78    const tokenBufferRef = useRef("");
    79    const rafIdRef = useRef<number | undefined>(undefined);
    79    const sessionIdRef = useRef(sessionId);
    80
    81    useEffect(() => {
    82      onFileCompleteRef.current = options?.onFileComplete;
    83    }, [options?.onFileComplete]);
    84
    85    useEffect(() => {
    86      onBundleRef.current = options?.onBundle;
    87    }, [options?.onBundle]);
    88
    89    useEffect(() => {
    90      sessionIdRef.current = sessionId;
    91    }, [sessionId]);
    92
    93    const addActivity = useCallback(
    94      (type: Activity["type"], message: string, path?: string) => {
    95        const id = `activity-${++activityCounterRef.current}`;
    96        setActivities((prev) => [
    97          ...prev,
    98          { id, type, message, path, timestamp: Date.now() },
    99        ]);
    100      },
    101    []
    102    );
    103
    104    const handleEvent = useCallback(
    105      (sseEvent: SSEEvent) => {
    106        switch (sseEvent.event) {
    107          case "session":
    108            setSessionId(sseEvent.sessionId);
    109            break;
    110
    111          case "status":
    112            if (sseEvent.status === "bundling") {
    113              // Keep showing generating state to user during bundling
    113              setStatus("generating");
    114            } else if (sseEvent.status === "live") {
    115              setStatus("live");
    116            } else if (sseEvent.status === "generating") {
    116              setStatus("generating");
    117            }
    118            break;
    119
    120          case "token":
    121            tokenBufferRef.current += sseEvent.token;
    121            if (!rafIdRef.current) {
    122              rafIdRef.current = requestAnimationFrame(() => {
    122                setStreamingText(tokenBufferRef.current);
    123                rafIdRef.current = undefined;
    124              });
    125            }
    126            break;
    127
    128          case "activity":
    129            addActivity(sseEvent.type, sseEvent.message, sseEvent.path);
    129            break;
    130
    131          case "file_complete": {
    132            const { path, contents = "" } = sseEvent;
    132            setFiles((prev) => {
    133              const idx = prev.findIndex((f) => f.path === path);
    134              const newFile: StreamingFile = { path, contents };
    135              if (idx >= 0) {
    135                const updated = [...prev];
    136                updated[idx] = newFile;
    136                return updated;
    137              }
    137              return [...prev, newFile];
    138            });
    139            // Write to WebContainer — log errors but don't fail the stream
    140            onFileCompleteRef.current?.(path, contents)?.catch((err: unknown) => {
    140              console.error(`[streaming] Failed to write ${path}:`, err);
    141            });
    142            break;
    143          }
    144
    145          case "app_name":
    145            setAppName(sseEvent.name);
    146            break;
    147
    148          case "blueprint": {
    148            const parsed = TherapyBlueprintSchema.safeParse(sseEvent.data);
    149            if (parsed.success) setBlueprint(parsed.data);
    150            break;
    150          }
    151
    152          case "image_generated":
    152            addActivity("file_written", `Generated image: ${sseEvent.label}`);
    153            break;
    153
    154          case "speech_generated":
    154            addActivity("file_written", `Generated audio: "${sseEvent.text}"`);
    155            break;
    155
    156          case "stt_enabled":
    156            addActivity("complete", "Speech input enabled");
    157            break;
    157
    158          case "bundle":
    158            setBundleHtml(sseEvent.html);
    159            onBundleRef.current?.(sseEvent.html);
    160            break;
    160
    161          case "done":
    161            // Flush any buffered tokens before marking as live
    162            if (rafIdRef.current) {
    162              cancelAnimationFrame(rafIdRef.current);
    163              rafIdRef.current = undefined;
    164            }
    165            setStreamingText(tokenBufferRef.current);
    165            setStatus("live");
    166            if (sseEvent.sessionId) setSessionId(sseEvent.sessionId);
    166            break;
    167
    168          case "error":
    168            setError(sseEvent.message);
    169            setStatus("failed");
    170            break;
    171        }
    172      },
    173      [addActivity]
    174    );
    175
    176    const generate = useCallback(
    176      async (prompt: string): Promise<void> => {
    177        if (abortRef.current) {
    177          abortRef.current.abort();
    178          // Cancel any pending rAF from the previous generation
    179          if (rafIdRef.current) {
    179            cancelAnimationFrame(rafIdRef.current);
    180            rafIdRef.current = undefined;
    181          }
    182        }
    183        const controller = new AbortController();
    183        abortRef.current = controller;
    184
    185        // Reset state for new generation
    186        setError(null);
    186        setStatus("generating");
    187        setStreamingText("");
    187        tokenBufferRef.current = "";
    188        setActivities([]);
    188        setFiles([]);
    189        setAppName(null);
    189        setBundleHtml(null);
    190
    191        try {
    191          const response = await fetch("/api/generate", {
    192            method: "POST",
    192            headers: { "Content-Type": "application/json" },
    193            body: JSON.stringify({
    193              prompt,
    194              sessionId: sessionIdRef.current ?? undefined,
    195            }),
    196            signal: controller.signal,
    197          });
    197
    198          if (!response.ok) {
    198            let detail = `Request failed: ${response.status}`;
    199            try {
    199              const errBody = await response.json();
    200              if (errBody.error) detail = errBody.error;
    201            } catch {
    201              // response may not be JSON
    202            }
    202            setError(detail);
    203            setStatus("failed");
    203            return;
    204          }
    204
    205          const body = response.body;
    205          if (!body) {
    206            setError("No response body");
    206            setStatus("failed");
    207            return;
    208          }
    208
    209          const reader = body.getReader();
    209          const decoder = new TextDecoder();
    210          let buffer = "";
    211
    212          while (true) {
    212            const { done, value } = await reader.read();
    213            if (done) break;
    213
    214            buffer += decoder.decode(value, { stream: true });
    214
    215            const lastDoubleNewline = buffer.lastIndexOf("\n\n");
    215            if (lastDoubleNewline === -1) continue;
    216
    217            const toProcess = buffer.slice(0, lastDoubleNewline + 2);
    217            buffer = buffer.slice(lastDoubleNewline + 2);
    218
    219            const events = parseSSEChunks(toProcess);
    219            for (const { event, data } of events) {
    220              const typed = parseSSEEvent(event, data);
    220              if (typed) handleEvent(typed);
    221            }
    222          }
    222
    223          // Process remaining buffer
    224          if (buffer.trim()) {
    224            const events = parseSSEChunks(buffer);
    225            for (const { event, data } of events) {
    225              const typed = parseSSEEvent(event, data);
    226              if (typed) handleEvent(typed);
    227            }
    228          }
    228        } catch (err) {
    229          if (err instanceof Error && err.name === "AbortError") return;
    229          setError(extractErrorMessage(err));
    230          setStatus("failed");
    230        }
    231      },
    232      [handleEvent]
    233    );
    234
    235    const resumeSession = useCallback(
    235      (args: ResumeSessionArgs) => {
    236        setSessionId(args.sessionId);
    236        sessionIdRef.current = args.sessionId;
    237        setFiles(args.files);
    237        setStatus("live");
    238        setError(null);
    238        setStreamingText("");
    239        setActivities([]);
    239        if (args.blueprint !== undefined) {
    240          setBlueprint(args.blueprint ?? null);
    241        }
    241        if (args.bundleHtml !== undefined) {
    242          setBundleHtml(args.bundleHtml ?? null);
    242        }
    243      },
    244      []
    245    );
    246
    247    // Cleanup on unmount: cancel pending rAF and abort in-flight request
    248    useEffect(() => {
    249      return () => {
    249        if (rafIdRef.current) {
    250          cancelAnimationFrame(rafIdRef.current);
    250        }
    250        if (abortRef.current) {
    251          abortRef.current.abort();
    251        }
    252      };
    253    }, []);
    254
    255    return {
    255      status,
    256      files,
    256      generate,
    257      resumeSession,
    257      blueprint,
    258      appName,
    258      error,
    259      sessionId,
    259      streamingText,
    260      activities,
    260      bundleHtml,
    261      reset,
    262    };
    263  }
```

**CRITICAL LINES:**
- Line 158-159: **ISSUE #10** — Bundle event handler sets `bundleHtml` to coerced string value
- Line 161-166: **ISSUE #4** — "done" event handler unconditionally sets status to "live"
- Line 162-163: Flushes buffered tokens (doesn't check buildFailed)

---

## File 3: src/core/sse-events.ts

Full file content (54 lines):

```typescript
     1  // Typed SSE event discriminated union and parser for the streaming builder
     2
     3  export type SSEEvent =
     4    | { event: "session"; sessionId: string }
     5    | { event: "status"; status: "generating" | "bundling" | "live" | "failed"; message?: string }
     6    | { event: "token"; token: string }
     7    | { event: "activity"; type: "thinking" | "writing_file" | "file_written" | "complete"; message: string; path?: string }
     8    | { event: "file_complete"; path: string; contents?: string }
     9    | { event: "app_name"; name: string }
    10    | { event: "blueprint"; data: unknown }
    11    | { event: "image_generated"; label: string; imageUrl: string }
    12    | { event: "speech_generated"; text: string; audioUrl: string }
    13    | { event: "stt_enabled"; purpose: string }
    14    | { event: "bundle"; html: string }
    15    | { event: "done"; sessionId?: string; files?: Array<{ path: string; contents: string }>; buildFailed?: boolean }
    16    | { event: "error"; message: string };
    17
    18  /**
    19    * Parse a raw SSE event + data into a typed SSEEvent.
    20    * Returns null for unrecognised event types so callers can skip them.
    21    */
    22  export function parseSSEEvent(event: string, data: unknown): SSEEvent | null {
    23    const d = data as Record<string, unknown>;
    24    switch (event) {
    25      case "session":
    26        return { event: "session", sessionId: String(d.sessionId ?? "") };
    27      case "status":
    28        return { event: "status", status: d.status as "generating" | "bundling" | "live" | "failed", message: d.message as string | undefined };
    29      case "token":
    30        return { event: "token", token: String(d.token ?? "") };
    31      case "activity":
    32        return { event: "activity", type: d.type as "thinking" | "writing_file" | "file_written" | "complete", message: String(d.message ?? ""), path: d.path as string | undefined };
    33      case "file_complete":
    34        return { event: "file_complete", path: String(d.path ?? ""), contents: String(d.contents ?? "") };
    35      case "app_name":
    36        return { event: "app_name", name: String(d.name ?? "") };
    37      case "blueprint":
    38        return { event: "blueprint", data: d };
    39      case "image_generated":
    40        return { event: "image_generated", label: String(d.label ?? ""), imageUrl: String(d.imageUrl ?? "") };
    41      case "speech_generated":
    42        return { event: "speech_generated", text: String(d.text ?? ""), audioUrl: String(d.audioUrl ?? "") };
    43      case "stt_enabled":
    44        return { event: "stt_enabled", purpose: String(d.purpose ?? "") };
    45      case "bundle":
    46        return { event: "bundle", html: String(d.html ?? "") };
    47      case "done":
    48        return { event: "done", sessionId: d.sessionId as string | undefined, files: d.files as Array<{ path: string; contents: string }> | undefined, buildFailed: d.buildFailed as boolean | undefined };
    49      case "error":
    50        return { event: "error", message: String(d.message ?? "Unknown error") };
    51      default:
    52        return null;
    53    }
    54  }
```

**CRITICAL LINES:**
- Line 14: Bundle event type requires non-empty string
- Line 34: **ISSUE #10** — file_complete contents coerced with `String(d.contents ?? "")`
- Line 46: **ISSUE #10** — bundle html coerced with `String(d.html ?? "")`
- Line 48: buildFailed is optional, can be undefined

---

## File 4: src/features/builder/lib/agent-tools.ts

Excerpt (lines 24-36):

```typescript
    24  export function isValidFilePath(path: string): boolean {
    25    const allowedRoots =
    26      /^(src\/|tailwind\.config\.(ts|js|cjs)$|vite\.config\.(ts|js)$|postcss\.config\.(ts|js|cjs)$)/;
    27    if (!allowedRoots.test(path)) return false;
    28
    29    if (!/^[a-zA-Z0-9\-_.\/]+$/.test(path)) return false;
    30
    31    if (path.includes("..") || path.includes("//")) return false;
    32
    33    if (!/\.(tsx|ts|css|json|cjs|js)$/.test(path)) return false;
    34
    35    return true;
    36  }
```

**ISSUE:** No enforcement that `src/App.tsx` is written. Validation only allows it, doesn't require it.

---

## File 5: artifacts/wab-scaffold/index.html

Full file content (16 lines):

```html
     1  <!doctype html>
     2  <html lang="en">
     3    <head>
     4      <meta charset="UTF-8" />
     5      <link rel="icon" href="data:," />
     6      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     7      <link rel="preconnect" href="https://fonts.googleapis.com">
     8      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     9      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    10      <title>wab-scaffold</title>
    11    </head>
    12    <body>
    13      <div id="root"></div>
    14      <script type="module" src="/src/main.tsx"></script>
    15    </body>
    16  </html>
```

**Line 14:** Requires src/main.tsx to exist and be valid JavaScript/TypeScript module.

---

## File 6: artifacts/wab-scaffold/src/main.tsx

Full file content (10 lines):

```typescript
     1  import { StrictMode } from 'react'
     2  import { createRoot } from 'react-dom/client'
     3  import './index.css'
     4  import App from './App.tsx'
     5
     6  createRoot(document.getElementById('root')!).render(
     7    <StrictMode>
     8      <App />
     9    </StrictMode>,
    10  )
```

**Line 4:** Requires src/App.tsx to be a valid React component with default export.

---

## File 7: src/features/builder/lib/agent-prompt.ts

Excerpt (lines 246-257):

```typescript
   246  ## File Generation Rules
   247
   248  You can write MULTIPLE files to build a well-structured app. Follow these rules:
   249
   250  1. **Always write `src/App.tsx`** — this is the entry point, mounted by main.tsx
   251  2. **Create additional files as needed** for custom components, types, data, or utilities
   252  3. **File paths must start with `src/`** — you cannot modify root files (package.json, vite.config.ts, index.html, main.tsx)
   253  4. **Do NOT overwrite pre-built files:** `src/components/ui/*`, `src/components/TokenBoard.tsx`, `src/components/SentenceStrip.tsx` (and other therapy components), `src/hooks/useLocalStorage.ts`, `src/hooks/useTTS.ts`, `src/lib/utils.ts`
   254  5. **Write COMPLETE file contents** — never use "// ... rest of code" or "// existing code" placeholders
   255  6. **Each file must be self-contained** — include all imports at the top
   256  7. **Use the write_file tool for each file** — one tool call per file
```

**Line 250:** "Always write `src/App.tsx`" — but this is just a prompt instruction with **NO VALIDATION**.

