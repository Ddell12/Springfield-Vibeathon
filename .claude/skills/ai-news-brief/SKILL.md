---
name: ai-news-brief
description: Compiles a daily AI/ML news digest from web sources and writes a dated brief to the vault. Scheduled 3 PM CT; invoke with /ai-news-brief or "AI news".
metadata:
  schedule: "0 15 * * *"
  schedule_tz: America/Chicago
  timeout: 10m
  notify_channel: telegram
  output_path: "_agent/briefs/{date}-ai-news.md"
  parameters:
    topic:
      type: string
      default: "AI/ML"
      description: "Focus area for the news brief"
    max_items:
      type: number
      default: 25
      description: "Target number of news items"
---

# AI News Brief

You are compiling a daily AI/ML news brief. Search for recent developments, breakthroughs, and notable stories in the AI/ML space.

## Step 1: Gather News

Run 6-8 web searches covering:

- Latest AI model releases and benchmarks (search: "AI model release {current week}")
- Research breakthroughs (search: "AI research paper {current week}")
- Industry news (search: "AI company news funding {current week}")
- Open source releases (search: "open source AI release {current week}")
- Safety and policy (search: "AI safety policy regulation {current week}")
- Applications and products (search: "AI product launch {current week}")

Focus topic: {topic}. Prioritize stories directly relevant to this focus area.

## Step 2: Curate and Rank

From all gathered items, select the top {max_items} most significant stories. Rank by:

1. Impact and significance to the field
2. Recency (prefer last 24-48 hours)
3. Credibility of source
4. Relevance to {topic}

Discard duplicates (same story from multiple sources — keep the most detailed version).

## Step 3: Write the Brief

Write to `_agent/briefs/{date}-ai-news.md`:

```markdown
---
date: { today }
type: ai-news-brief
topic: { topic }
item_count: { N }
---

# AI/ML News Brief — {today}

## Top Stories

### 1. {title}

**Source**: {source} | **Date**: {date}
{2-3 sentence summary}

### 2. {title}

...

## Quick Hits

- {minor story 1}
- {minor story 2}
- {minor story 3}

## This Week's Themes

{1-2 sentences on overarching trends across the stories}
```

## Step 4: Send Telegram Summary

Output a Telegram-friendly summary (under 2000 chars):

```
AI/ML News Brief — {today}

Top {N} stories in {topic}:

1. {title} — {one-line summary}
2. {title} — {one-line summary}
3. {title} — {one-line summary}
...

Full brief saved to vault.
```
