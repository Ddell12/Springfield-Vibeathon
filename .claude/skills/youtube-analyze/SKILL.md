---
name: youtube-analyze
description: Analyzes YouTube videos using Gemini 2.5 Pro — extracts summary, key points, timestamps, and transcript summary. Saves analysis to vault. Invoke with /youtube-analyze <url>.
metadata:
  timeout: 3m
  parameters:
    url:
      type: string
      required: true
      description: "YouTube video URL or video ID"
    detail:
      type: string
      default: "detailed"
      description: "Summary depth: brief | medium | detailed"
    question:
      type: string
      description: "Optional specific question to answer about the video"
---

# YouTube Video Analysis

You are analyzing a YouTube video using Google's Gemini 2.5 Pro model, which has native YouTube video understanding capabilities. It processes the actual video frames and audio — not just a text transcript.

## Step 1: Validate URL and Extract Video ID

Parse `{url}` to extract the YouTube video ID. Supported formats:

| Format      | Example                                                        | Extract       |
| ----------- | -------------------------------------------------------------- | ------------- |
| Standard    | `https://www.youtube.com/watch?v=dQw4w9WgXcB`                  | `dQw4w9WgXcB` |
| Short       | `https://youtu.be/dQw4w9WgXcB`                                 | `dQw4w9WgXcB` |
| Embed       | `https://www.youtube.com/embed/dQw4w9WgXcB`                    | `dQw4w9WgXcB` |
| Raw ID      | `dQw4w9WgXcB`                                                  | `dQw4w9WgXcB` |
| With params | `https://www.youtube.com/watch?v=dQw4w9WgXcB&t=120&list=PLxyz` | `dQw4w9WgXcB` |

**Validation rules:**

- Video IDs are 11 characters: alphanumeric, hyphens, underscores
- If the URL doesn't match any format above, STOP and tell the user:
  > Invalid YouTube URL. Supported formats: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`, or a raw 11-character video ID.

Store the extracted video ID as `VIDEO_ID` and the canonical URL as `https://www.youtube.com/watch?v={VIDEO_ID}`.

## Step 2: Check for Existing Analysis

Check if a vault note already exists for this video:

```bash
ls ~/Documents/Life\ Management/Resources/YouTube/{VIDEO_ID}.md
```

**If the file exists:**

1. Read it and display the contents to the user
2. Tell the user: "This video was previously analyzed on {date_analyzed}. Showing saved analysis."
3. STOP — do not call Gemini again

**If the file does not exist:** Continue to Step 3.

## Step 3: Verify API Key

The key lives in `~/Aura/.env` and is usually NOT in the shell environment. Read it directly from the file:

```bash
grep '^GOOGLE_API_KEY=' ~/Aura/.env | cut -d'=' -f2
```

**If empty or missing**, STOP and tell the user:

> GOOGLE_API_KEY not found. To set it up:
>
> 1. Get an API key from https://aistudio.google.com/apikey
> 2. Add `GOOGLE_API_KEY=your-key-here` to your `~/Aura/.env` file
> 3. Re-run this skill

**If present:** Continue to Step 4.

**CRITICAL — shell variable gotcha:** Do NOT use command substitution (`API_KEY=$(grep ...)`) and then interpolate into a curl URL — this causes curl "URL malformed" errors due to invisible characters. Instead, read the key value and assign it as a **direct string literal** in subsequent bash commands:

```bash
API_KEY="<paste the value you read above>"
```

## Step 4: Build Analysis Prompt

Construct the Gemini prompt based on the `{detail}` parameter:

**If detail = "brief":**

> Analyze this YouTube video. Return a JSON object with these fields:
>
> - "title": video title
> - "channel": channel name
> - "duration": video duration as "Xm Ys"
> - "summary": 2-3 sentence summary
> - "key_points": array of 3-5 key takeaways (one sentence each)

**If detail = "medium":**

> Analyze this YouTube video. Return a JSON object with these fields:
>
> - "title": video title
> - "channel": channel name
> - "duration": video duration as "Xm Ys"
> - "summary": comprehensive paragraph summary (100-200 words)
> - "key_points": array of 5-8 key takeaways (one sentence each)
> - "timestamps": array of objects {"time": "MM:SS", "topic": "description"} for major topic changes
> - "transcript_summary": condensed version of what was said, preserving key quotes in quotation marks (200-400 words)

**If detail = "detailed" (default):**

> Analyze this YouTube video thoroughly. Return a JSON object with these fields:
>
> - "title": video title
> - "channel": channel name
> - "duration": video duration as "Xm Ys"
> - "summary": comprehensive summary (200-400 words)
> - "key_points": array of 8-12 key takeaways (one sentence each)
> - "timestamps": array of objects {"time": "MM:SS", "topic": "description"} for all topic changes and notable moments
> - "transcript_summary": detailed condensed transcript preserving key quotes, arguments, and examples (400-800 words)
> - "visual_notes": description of any important visuals shown (diagrams, code, slides, demos)

**If `{question}` is provided**, append to the prompt:

> Additionally, answer this specific question about the video:
> "{question}"
> Include the answer in a field called "question_answer" with a thorough response.

**For all detail levels**, append:

> IMPORTANT: Return ONLY valid JSON. No markdown formatting, no code fences, no explanation outside the JSON object.

## Step 5: Call Gemini API

Write the request body to a temp file to avoid shell escaping issues, then call curl.

**5a. Write request body:**

```bash
cat > /tmp/gemini_yt_req.json << 'REQEOF'
{
  "contents": [{
    "parts": [
      {"file_data": {"file_uri": "https://www.youtube.com/watch?v=VIDEO_ID"}},
      {"text": "PROMPT_FROM_STEP_4"}
    ]
  }],
  "generationConfig": {
    "temperature": 0.2,
    "responseMimeType": "application/json"
  }
}
REQEOF
```

**Replace** `VIDEO_ID` and `PROMPT_FROM_STEP_4` with actual values before writing the file. Since the heredoc uses `'REQEOF'` (quoted), no shell expansion occurs — safe for any prompt content.

**5b. Execute the API call:**

Use the API key as a **direct string literal** (see Step 3 gotcha). Set timeout to 180s for long videos.

```bash
API_KEY="<literal key value from Step 3>"
curl -s --max-time 180 \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=$API_KEY" \
  -H 'Content-Type: application/json' \
  -d @/tmp/gemini_yt_req.json > /tmp/gemini_yt_resp.json
```

**Error handling** — check the response for errors:

| HTTP Status / Error      | Action                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 200 + valid JSON         | Continue to Step 5c                                                                                                 |
| 200 + empty/malformed    | Retry once. If second attempt fails: "Gemini returned an empty response. The video may be too long or unavailable." |
| 400 "INVALID_ARGUMENT"   | "This video cannot be analyzed. It may be private, unlisted, age-restricted, or a live stream."                     |
| 403 "PERMISSION_DENIED"  | "GOOGLE_API_KEY is invalid or expired. Get a new key at https://aistudio.google.com/apikey"                         |
| 429 "RESOURCE_EXHAUSTED" | "Gemini rate limit reached. Free tier allows 8 hours of YouTube video per day. Try again later."                    |
| Timeout (180s)           | "Gemini timed out processing this video. Try a shorter video or try again later."                                   |
| Any other error          | Display the raw error message from Gemini for debugging                                                             |

**5c. Parse the response with cleanup:**

Gemini sometimes returns corrupted JSON — non-ASCII garbage bytes between tokens and trailing commas. Always parse with this cleanup:

```bash
python3 << 'PYEOF'
import json, re

with open('/tmp/gemini_yt_resp.json') as f:
    resp = json.load(f)

text = resp['candidates'][0]['content']['parts'][0]['text']

# Fix 1: Remove non-ASCII garbage bytes between JSON tokens
text = re.sub(r'",\s*[^\x00-\x7F]+?"', '",\n      "', text)
# Fix 2: Remove trailing commas before } or ]
text = re.sub(r',\s*([}\]])', r'\1', text)

data = json.loads(text)

with open('/tmp/gemini_yt_parsed.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(json.dumps(data, indent=2, ensure_ascii=False))
PYEOF
```

If parsing still fails after cleanup, show the raw text around the error location for debugging.

**5d. Cleanup temp files** after the analysis is saved to vault:

```bash
rm -f /tmp/gemini_yt_req.json /tmp/gemini_yt_resp.json /tmp/gemini_yt_parsed.json
```

## Step 6: Display Analysis

Format and display the parsed JSON response as markdown:

```
# YouTube Analysis: {title}

**Channel:** {channel} | **Duration:** {duration}

## Summary

{summary}

## Key Points

- {key_points[0]}
- {key_points[1]}
- ...

## Notable Timestamps

- [{timestamps[0].time}] {timestamps[0].topic}
- [{timestamps[1].time}] {timestamps[1].topic}
- ...

## Transcript Summary

{transcript_summary}
```

**Conditional sections:**

- **Visual Notes** — only include if `detail` = "detailed" and `visual_notes` is non-empty:

```
## Visual Notes

{visual_notes}
```

- **Answer** — only include if `{question}` was provided:

```
## Answer: {question}

{question_answer}
```

**If any field is missing** from the Gemini response, omit that section silently — do not show empty headers.

## Step 7: Save to Vault

Create the vault directory if it doesn't exist:

```bash
mkdir -p ~/Documents/Life\ Management/Resources/YouTube
```

Write the analysis to `~/Documents/Life Management/Resources/YouTube/{VIDEO_ID}.md` with this structure:

```
---
title: "{title}"
channel: "{channel}"
url: "https://www.youtube.com/watch?v={VIDEO_ID}"
date_analyzed: "{YYYY-MM-DD}"
duration: "{duration}"
tags:
  - youtube
  - video-analysis
---

{Same formatted content as displayed in Step 6}
```

After saving, tell the user:

> Analysis saved to `Resources/YouTube/{VIDEO_ID}.md`

## Boundaries

- NEVER download or play the video
- NEVER access private/age-restricted content
- NEVER store the API key in any file
- NEVER modify existing vault notes (only create new ones)
- If any step fails, display the error and STOP — do not leave partial files
