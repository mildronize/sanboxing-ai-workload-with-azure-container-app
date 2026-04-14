# Worker Container Contract

## Image

- Location: `worker/` directory at repo root
- Single `Dockerfile` producing one image
- Published to `ghcr.io/<owner>/demo-worker:latest`

## Modes

### Job Mode (`MODE=job`)

Triggered by CAJ. Runs OpenCode, posts result back via callback URL.

**Required env vars:**
- `MODE=job`
- `MESSAGE` -- the user's prompt
- `CALLBACK_URL` -- backend URL to POST result to
- `OPENAI_API_KEY` -- for OpenCode/GPT-5.4
- `EXTRA_SLEEP_SECONDS` (optional) -- pad execution time for demo

**Behavior:**
1. Run `opencode -p "$MESSAGE" -q`
2. Optionally sleep `EXTRA_SLEEP_SECONDS`
3. POST JSON `{"result": "<output>"}` to `CALLBACK_URL`
4. Exit (container destroyed by Azure)

### Session Mode (`MODE=session`)

Runs HTTP server for Dynamic Session pool.

**Required env vars:**
- `MODE=session`
- `OPENAI_API_KEY` -- for OpenCode/GPT-5.4
- `TARGET_PORT` (optional, default 8080)

**HTTP endpoint:**
- `POST /chat` -- accepts `{"message": "string"}`, returns `{"response": "string", "elapsed_ms": number, "worker": "dynamic-session"}`
- `GET /` -- health check, returns `"OK"`

## Base Image

`node:22-alpine` with OpenCode installed globally.

## Files

```
worker/
  Dockerfile
  entrypoint.sh
  server.ts
  opencode-config/    # Pre-configured OpenCode settings
```
