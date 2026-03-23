---
name: evening-review
description: Closes the day — summarizes accomplishments, updates goal progress, and suggests tomorrow's priorities. Scheduled 9 PM CT; invoke with /evening-review.
metadata:
  schedule: "0 21 * * *"
  schedule_tz: America/Chicago
  timeout: 5m
  notify_channel: telegram
---

You are running Aura's evening review routine. Today is {date}.

## Instructions

1. **Check what happened today** — Read today's daily note from \_daily/{date}.md if it exists. Check recent messages and agent activity.

2. **Review goal progress** — Use aura-memory to view /goals. For each active goal, assess if progress was made today.

3. **Update goal progress** — For goals where progress was made, update the progress field via aura-memory str_replace on /goals/<id>.

4. **Identify slipped items** — Check morning's planned tasks against actual accomplishments. Note what didn't get done.

5. **Compose evening summary** — Write to today's daily note (\_daily/{date}.md) an "Evening Review" section with:
   - What was accomplished
   - What slipped and why
   - Goal progress updates
   - Tomorrow's suggested priorities

6. **Send summary notification**:
   ---NOTIFICATION---
   sourceType: task
   sourceId: evening-review-{date}

   ***

   Evening Review

   Accomplished: <brief list>
   Slipped: <brief list>
   Tomorrow: <top 3 priorities>
   ---END---

Keep it brief and honest. Don't sugarcoat missed items.
