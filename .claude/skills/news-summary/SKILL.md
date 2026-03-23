---
name: news-summary
description: Fetch and summarize news from trusted international RSS feeds. Use when the user asks for news updates, daily briefings, morning briefings, what's happening in the world, headlines, current events, top stories, breaking news, or any request for recent news coverage. Can produce text summaries grouped by topic and optional voice summaries via OpenAI TTS.
---

# News Summary

## RSS Feeds

| Category | Feed URL |
|----------|----------|
| BBC World | `https://feeds.bbci.co.uk/news/world/rss.xml` |
| BBC Top Stories | `https://feeds.bbci.co.uk/news/rss.xml` |
| BBC Business | `https://feeds.bbci.co.uk/news/business/rss.xml` |
| BBC Tech | `https://feeds.bbci.co.uk/news/technology/rss.xml` |
| Reuters World | `https://www.reutersagency.com/feed/?best-regions=world&post_type=best` |
| NPR (US) | `https://feeds.npr.org/1001/rss.xml` |
| Al Jazeera | `https://www.aljazeera.com/xml/rss/all.xml` |

## AI News Feeds

| Category | Feed URL |
|----------|----------|
| TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` |
| The Verge AI | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` |
| Ars Technica AI | `https://arstechnica.com/ai/feed/` |
| VentureBeat AI | `https://venturebeat.com/category/ai/feed/` |
| MIT Tech Review AI | `https://www.technologyreview.com/topic/artificial-intelligence/feed` |

## Workflow

### Text Summary

1. Run `scripts/fetch_rss.sh <feed_url> [max_items]` for each desired feed
   - Default: BBC World + one supplementary source for balance
   - Add more feeds if the user requests broader coverage
2. Synthesize headlines into a concise summary (5-8 top stories)
3. Group by region or topic
4. Prioritize breaking news and major events
5. Balance Western and Global South perspectives when using multiple sources

### Voice Summary (only if requested)

Requires `$OPENAI_API_KEY` in the environment. If unavailable, inform the user and offer the text summary instead.

1. Generate a text summary first (keep under ~300 words for ~2 minutes read aloud)
2. Generate audio:
```bash
curl -s https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1-hd",
    "input": "<summary text>",
    "voice": "onyx",
    "speed": 0.95
  }' \
  --output /tmp/news.mp3
```
3. Deliver the audio file to the user

## Output Format

Adapt this default structure based on available stories:

```
News Summary — [date]

WORLD
- [headline]: [one-sentence context]
- [headline]: [one-sentence context]

BUSINESS
- [headline]: [one-sentence context]

TECH
- [headline]: [one-sentence context]

Sources: BBC, Reuters, Al Jazeera
```

Keep each entry to one headline + one sentence of context. Cite sources at the bottom.
