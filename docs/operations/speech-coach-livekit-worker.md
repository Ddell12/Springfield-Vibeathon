# Speech Coach LiveKit Worker

The speech coach has two runtime pieces:

- The Next.js app, which creates sessions and issues LiveKit room tokens.
- The LiveKit worker, which joins rooms as the speaking agent.

The worker is started locally with:

```bash
npm run speech-coach:agent
```

Required environment variables:

```bash
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GOOGLE_API_KEY=...
```

## Production note

Vercel only hosts the web app. The speech coach worker is a separate long-lived process and must be deployed on its own runtime.

If the web app is live but the worker is not running, caregivers can still enter a speech coach room and talk, but the coach will not answer.

## Current voice path

Speech coach currently uses Gemini realtime native audio directly. Do not re-enable a "separate TTS" mode unless `AgentSession` is also given a real `tts` provider.
