# Design Spec: Sandbox AI Workload Demo App

## Overview

### Why This Talk

AI coding agents (Claude Code, OpenCode, Codex CLI, etc.) need to execute code — and that code can't run on your production servers. The industry response has been a wave of sandbox tooling: Firecracker microVMs, gVisor, Kata Containers, Nydus snapshots, E2B, and more. They work, but they all push the same problems onto your plate:

- **Infrastructure management** — You're now operating a fleet of ephemeral VMs or containers. Provisioning, networking, image registries, autoscaling, health checks — all yours.
- **Cost control** — Idle warm pools burn money. Cold starts frustrate users. Finding the sweet spot requires constant tuning.
- **Security hardening** — Sandboxing is only as strong as its weakest config. Egress rules, filesystem isolation, secret injection, identity management — miss one and you have a hole.

Azure Container Apps absorbs most of this. Container Apps Jobs handle long-running, on-demand workloads with automatic teardown. Dynamic Sessions (custom container) provide Hyper-V isolated, pre-warmed sandboxes with sub-second startup — and Azure manages the pool, scaling, and lifecycle. You bring the image; Azure handles the rest.

This talk demonstrates both approaches side by side, using the same container image, to show when to pick which.

### What We're Building

A minimal chat web UI for the **Azure Global** talk: _"Sandboxing AI Workloads on Azure Container Apps"_. The presenter interacts with a single chat interface on stage. Each message sent from the UI spins up a **worker** — either a Container Apps Job (CAJ) or a Dynamic Session — with **OpenCode (GPT-5.4) running inside the worker itself**. No middleware, no orchestrator. Two layers, that's it.

```
Chat UI  →  Worker (OpenCode inside)
```

The two worker types demonstrate the core trade-off:
- **CAJ:** Full container, custom image, manual trigger, cold start (~10-30s), suited for long-running tasks, destroyed after completion.
- **Dynamic Session:** Custom container session pool (Hyper-V isolated), pre-warmed, instant start (~sub-second), session-scoped sandbox.

Both workers use the **same base container image** — the only difference is how Azure spins them up.

## Demo Flow (25 min talk)

1. **Opening move (minute 0):** Presenter types something like _"Write a report about Azure Container Apps best practices, then notify me on Telegram when it's done"_ → UI triggers a **CAJ worker** (manual trigger). Cold start is visible and intentional. OpenCode inside the job starts working on the report — a genuinely long-running task.
   - **Demo point 1: Cold start time** — audience sees the delay before the job even begins.
   - **Demo point 2: Long-running task** — the job keeps running in the background while the talk continues. This is what CAJ is built for — workloads that take minutes, not seconds.
2. **Slides / architecture talk (minutes 1–12).**
3. **Live demo (minutes 12–20):** Presenter returns to the chat UI and asks general questions → UI routes to **Dynamic Session worker**. OpenCode responds instantly. No cold start. This is the contrast — interactive, short-lived tasks.
4. **Telegram notification arrives:** The CAJ job finished the report and sent the Telegram notification. Presenter pauses: _"That's the Container Apps Job we kicked off at the start — it wrote the report, and now it's done."_
5. **Wrap-up (minutes 20–25):** Compare the two approaches, decision matrix, Q&A.

## Architecture

```
┌─────────────────────────────────┐
│  React Chat UI (Browser)        │
│  assistant-ui + Vite            │
└──────────┬──────────────────────┘
           │ HTTP
           ▼
┌─────────────────────────────────┐
│  Backend API (Bun)              │
│  Routes message to worker type  │
└──────┬────────────┬─────────────┘
       │            │
       ▼            ▼
┌────────────┐ ┌──────────────────────────┐
│ CAJ Worker │ │ Dynamic Session Worker   │
│            │ │ (Custom Container)       │
│ OpenCode   │ │                          │
│ + GPT-5.4  │ │ OpenCode + GPT-5.4      │
│            │ │ + HTTP server            │
│ manual     │ │                          │
│ trigger    │ │ Hyper-V isolated         │
│ cold start │ │ pre-warmed pool          │
│ destroyed  │ │ instant start            │
│ after done │ │ destroyed after cooldown │
└────────────┘ └──────────────────────────┘

Same base image, different execution model.
```

## Frontend — React Chat UI

### Stack

- **React 18+** with TypeScript
- **assistant-ui** — chat component library
- **Tailwind CSS** — styling
- **Vite** — dev server / build

### Components

| Component | Responsibility |
|---|---|
| `App` | Root layout. Single full-screen chat view. |
| `ChatPanel` | Wraps assistant-ui Thread. Connects to backend. |
| `StatusBadge` | Pill badge on AI messages: `⏳ CAJ (cold start: 14s)` or `⚡ Dynamic Session (180ms)`. |

### Key UX Decisions

- **No auth screen.** Demo app; hardcode or env-inject tokens.
- **Dark theme.** Better visibility on projector.
- **Large font.** Minimum 18px body text for audience readability.
- **Show latency.** Every response displays which worker type handled it and how long it took. This IS the point of the demo.

### Wireframe

```
┌──────────────────────────────────────────────┐
│  Sandbox AI Workload Demo          [GPT-5.4] │
├──────────────────────────────────────────────┤
│                                              │
│  👤 Write a report about Azure Container     │
│     Apps best practices, then notify me on   │
│     Telegram when it's done                  │
│                                              │
│  🤖 On it — kicked off a background job.     │
│     I'll send the result to Telegram.        │
│     ⏳ CAJ | cold start: 14.2s               │
│                                              │
│  👤 What is Azure Container Apps?            │
│                                              │
│  🤖 Azure Container Apps is a serverless ... │
│     ⚡ Dynamic Session | 180ms               │
│                                              │
├──────────────────────────────────────────────┤
│  [Type a message...]                  [Send] │
└──────────────────────────────────────────────┘
```

## Backend API

### Stack

- **Bun** runtime
- **Hono** or `Bun.serve`

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Accept user message, decide worker type, trigger worker, return response. |
| `GET` | `/api/health` | Health check. |

### Worker Routing Logic

The backend decides which worker to use. For the demo, this can be simple:

- A toggle/flag in the request (e.g. `?worker=caj` or `?worker=session`)
- Or a UI toggle button the presenter clicks to switch between modes
- Or hardcoded: first message → CAJ, subsequent messages → Dynamic Session

### Triggering CAJ Worker

1. Backend calls Azure REST API to **manually start** a Container Apps Job
2. Pass user message as env var (e.g. `MESSAGE="Write a report about..."`)
3. Job container cold starts → OpenCode generates the report (long-running) → optionally sleeps → sends Telegram notification with result summary
4. Container exits and is destroyed
5. Backend can acknowledge the job was started immediately; the result arrives async via Telegram

### Triggering Dynamic Session Worker

Dynamic Sessions use a **custom container session pool**. The pool pre-warms containers with the same image used by CAJ. The session pool exposes a management endpoint that proxies HTTP requests to the container.

1. Backend sends HTTP request to session pool management endpoint:
   ```
   POST https://<POOL_NAME>.<ENV_ID>.<REGION>.azurecontainerapps.io/chat?identifier=<SESSION_ID>
   Authorization: Bearer <token>
   Content-Type: application/json

   {
     "message": "What is Azure Container Apps?"
   }
   ```
2. If no session exists for that identifier, the pool **automatically allocates one** from pre-warmed instances (sub-second).
3. The request path (`/chat`) is forwarded to the container's HTTP server.
4. OpenCode inside the container processes the message and returns the response.
5. Session stays alive until cooldown period expires, then auto-destroyed.

**Auth:** Backend authenticates using `DefaultAzureCredential` to get a token for `https://dynamicsessions.io/.default`. The caller needs the **Azure ContainerApps Session Executor** role.

## Worker Container Image

Both CAJ and Dynamic Session use the **same base image**. The difference is the entrypoint mode.

```dockerfile
FROM node:22-alpine

# Install OpenCode
RUN npm install -g opencode-ai

# Install curl for Telegram API calls
RUN apk add --no-cache curl

# Pre-configure OpenCode with GPT-5.4
COPY opencode-config /root/.config/opencode/

# Copy entrypoint and HTTP server
COPY entrypoint.sh /entrypoint.sh
COPY server.ts /app/server.ts
RUN chmod +x /entrypoint.sh

# Default: HTTP server mode (for Dynamic Sessions)
# Override CMD for CAJ one-shot mode
CMD ["/entrypoint.sh"]
```

### Entrypoint (mode switch)

```bash
#!/bin/sh
# entrypoint.sh

if [ "$MODE" = "job" ]; then
  # === CAJ mode: long-running task ===
  # 1. Run OpenCode to generate the report (long-running)
  REPORT=$(opencode -p "$MESSAGE" -q)

  # 2. Save report output (optional: write to blob storage)
  echo "$REPORT" > /tmp/report.md

  # 3. Sleep to pad remaining time if task finishes early
  if [ -n "$EXTRA_SLEEP_SECONDS" ]; then
    sleep "$EXTRA_SLEEP_SECONDS"
  fi

  # 4. Notify via Telegram that the job is done
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="✅ Report is done! Here's a summary: $(head -c 500 /tmp/report.md)"
else
  # === Dynamic Session mode: HTTP server ===
  bun run /app/server.ts
fi
```

### HTTP Server for Dynamic Session mode

```typescript
// server.ts — minimal HTTP wrapper around OpenCode CLI
import { $ } from "bun";

Bun.serve({
  port: Number(process.env.TARGET_PORT) || 8080,
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const { message } = await req.json();
    const startTime = Date.now();

    // Run OpenCode in non-interactive mode
    const result = await $`opencode -p ${message} -q`.text();

    const elapsed = Date.now() - startTime;

    return Response.json({
      response: result.trim(),
      elapsed_ms: elapsed,
      worker: "dynamic-session",
    });
  },
});
```

## Session Pool Configuration

```bash
# Create custom container session pool
az containerapp sessionpool create \
  --name demo-session-pool \
  --resource-group <RG> \
  --location <REGION> \
  --container-type CustomContainer \
  --image <ACR>.azurecr.io/demo-worker:latest \
  --registry-server <ACR>.azurecr.io \
  --cpu 1.0 \
  --memory 2.0Gi \
  --target-port 8080 \
  --cooldown-period 300 \
  --max-sessions 10 \
  --ready-session-instances 2 \
  --env-vars \
    OPENAI_API_KEY=<KEY> \
    MODE=session
```

Key settings:
- `--ready-session-instances 2` — keep 2 containers pre-warmed at all times for instant allocation.
- `--cooldown-period 300` — destroy session after 5 min idle (plenty for demo).
- `--target-port 8080` — the port our HTTP server listens on.
- `--container-type CustomContainer` — not the built-in Python interpreter; our own image.

## Azure Resources Required

| Resource | Purpose |
|---|---|
| Container Apps Environment | Hosts both CAJ and Dynamic Sessions pool |
| Container Apps Job (manual trigger) | CAJ worker — long-running tasks with OpenCode, `MODE=job` |
| Custom Container Session Pool | Pre-warmed pool of the same image, `MODE=session` |
| Azure Container Registry | Store the shared worker image |
| Telegram Bot | Receives the reminder (existing HuskClaw bot) |

## Non-Goals

- Not a production app. No auth, no persistence, no error recovery.
- Not a general-purpose chat. Only needs to work for 25 minutes on stage.
- Not multi-user. Single presenter, single session.

## Pre-Demo Checklist

- [ ] Worker image built and pushed to ACR (single image, both modes)
- [ ] OpenCode + GPT-5.4 credentials injected via env vars
- [ ] Session pool created with `--ready-session-instances 2` and verified warm
- [ ] CAJ manual trigger tested end-to-end (report generation + Telegram delivery)
- [ ] `EXTRA_SLEEP_SECONDS` calibrated so Telegram arrives at a good time during the talk
- [ ] Dynamic Session tested: POST to management endpoint returns response
- [ ] `Azure ContainerApps Session Executor` role assigned to backend identity
- [ ] Telegram bot token configured and tested
- [ ] Network: egress enabled on session pool (needs to reach OpenAI API)
- [ ] Font size verified on projector resolution
- [ ] Backup: pre-recorded video of both demo paths

## Open Questions

1. **CAJ timing control** — The report generation time depends on OpenCode + GPT-5.4 response length. `EXTRA_SLEEP_SECONDS` can pad the total duration, but rehearsal is needed to find the right values so the Telegram notification arrives at a good moment during the talk.
2. **GPT-5.4 availability** — GPT-5.2 retires June 5, 2026. Confirm talk date and plan accordingly.
3. **Session pool region** — Custom container sessions may not be available in all regions. Verify availability in the target region.
4. **Image size** — Node.js + OpenCode image may be large. Consider build optimization to keep pre-warm fast.
