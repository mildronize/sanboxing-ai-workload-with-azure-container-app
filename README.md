# Sandboxing AI Workloads on Azure Container Apps

Demo app for the talk **"Sandboxing AI Workloads on Azure Container Apps"** at [Global Azure 2026 – Thailand](https://globalazure.net/) (18 Apr 2026, SCBX NEXT TECH, Siam Paragon, Bangkok).

A chat UI that demonstrates two Azure Container Apps execution models side-by-side — same AI-generated Python code, two different sandboxed environments.

![Demo Screenshot](docs/images/demo-screenshot.png)
<!-- TODO: Add screenshot after the talk -->

## The Problem

Running AI-generated code in production is risky. Azure Container Apps solves three problems:

| Problem | Solution |
|---------|----------|
| **Security** | Hyper-V isolated per session — code never touches production infra |
| **Cost** | $0.03/session-hour, consumption-based, scale to zero |
| **Infra management** | Microsoft manages the pool, scaling, and lifecycle |

## Architecture

```
User --> Chat UI (React) --> Backend (Elysia/Bun)
                                |
                                +-- Azure OpenAI (gpt-4o-mini, tool calling)
                                |   "Generate Python code via execute_python tool"
                                |
                                +-- Dynamic Session (PythonLTS)
                                |   POST /executions --> stdout in ~200ms
                                |   Pre-warmed, Hyper-V isolated, $0.03/hr
                                |
                                +-- Container App Job (CAJ)
                                    CODE env var --> runs Python --> POSTs stdout back
                                    Cold start ~15-30s, destroyed after done
```

The backend calls Azure OpenAI with tool calling — the model generates Python code via the `execute_python` tool. The code then runs in either:

- **Dynamic Session (PythonLTS):** Instant execution in a Microsoft-managed, pre-warmed Jupyter kernel. Session state persists across messages.
- **Container App Job (CAJ):** Fire-and-forget batch execution in an ephemeral container. Cold start, destroyed after completion.

![Architecture Diagram](docs/images/architecture.png)
<!-- TODO: Add architecture diagram -->

## Dynamic Session vs Container App Job

| | Dynamic Session | Container App Job |
|---|---|---|
| Start time | Instant (pre-warmed) | 10-30s cold start |
| Interaction | Synchronous, multi-turn | Async, fire-and-forget |
| Container | Reused per session | Destroyed after done |
| Isolation | Hyper-V per session | Container-level |
| Cost | $0.03/session-hour | Pay per execution |
| Use case | Interactive code execution | Batch / background jobs |

## Demo Flow (25 min)

1. **Minute 0** — Send a message via CAJ mode (triggers cold start)
2. **Minutes 1-12** — Architecture slides while CAJ runs in background
3. **Minutes 12-20** — Live chat via Dynamic Session — model generates Python, PythonLTS executes it in milliseconds
4. **Minute ~18** — CAJ result pops into chat
5. **Minutes 20-25** — Decision matrix, Q&A

The UI shows the generated Python code, execution output (stdout), and the model's formatted reply for each message.

![Chat UI](docs/images/chat-ui.png)
<!-- TODO: Add chat UI screenshot showing code + stdout blocks -->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TanStack Router, Tailwind CSS v4, assistant-ui |
| Backend | Elysia (Bun runtime), Azure OpenAI SDK (tool calling) |
| Database | Prisma v7 (SQLite via libsql) |
| AI | Azure OpenAI gpt-4o-mini with `execute_python` tool |
| Sessions | Azure Container Apps Dynamic Sessions (PythonLTS) |
| Jobs | Azure Container Apps Jobs (manual trigger) |
| Worker | Python 3.12 (stdlib only, zero dependencies) |
| Auth | Better Auth (email/password) |
| Infra | Terraform, GitHub Actions |

## Quick Start (Mock Mode)

Run locally without Azure credentials — mock workers simulate both execution paths.

```bash
# Install
bun install

# Set up environment
cp .env.example .env

# Generate Prisma client and create local DB
bun run db:generate
bun run db:push

# Start dev server
bun run dev
# Open http://localhost:3000/chat
```

Mock mode returns fake Python code and stdout. Toggle between "Dynamic Session" and "Container App Job" in the UI to see both paths.

## Deploy to Azure

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for the full deployment guide — covers Terraform setup, Azure OpenAI configuration, ngrok tunneling for local development, and end-to-end testing.

## Project Structure

```
server/
  index.ts                         # Composition root
  context/app-context.ts           # DI container (AppConfig, ServiceContainer)
  lib/
    openai.ts                      # Azure OpenAI client, tool def, agent loop
    azure.ts                       # CAJ trigger + PythonLTS /executions client
  modules/
    chat/                          # Chat module (routes, service, repository)

app/
  routes/                          # TanStack Router
  features/
    chat/                          # Chat UI (ChatPanel, StatusBadge, useChat hook)
  components/                      # Header, ThemeToggle, shadcn/ui

worker/
  Dockerfile                       # python:3.12-slim (CAJ only)
  run.py                           # Reads CODE, runs it, POSTs stdout to CALLBACK_URL

terraform/                         # Azure infra (session pool, CAJ job, backend app)
prisma/schema.prisma               # ChatMessage, WorkerResult models
```

## How It Works

1. User sends a message in the chat UI
2. Backend calls Azure OpenAI (gpt-4o-mini) with the `execute_python` tool definition
3. Model generates Python code via tool calling
4. **Session path:** Backend POSTs code to PythonLTS `/executions` endpoint, gets stdout back, feeds result to model for a formatted reply. Self-corrects up to 5 times if code fails.
5. **CAJ path:** Backend triggers a Container App Job with `CODE` env var. The minimal Python container runs it and POSTs stdout back via callback.
6. UI renders the generated code, stdout, and model reply as separate blocks

## Development Commands

```bash
bun run dev              # Start frontend + backend concurrently
bun run build            # Build frontend
bun run db:generate      # Regenerate Prisma client + prismabox schemas
bun run db:push          # Push schema changes to SQLite
bunx tsc --noEmit        # Type check
```

## Documentation

- **[Deployment Guide](docs/DEPLOY.md)** — Zero to working demo on Azure
- **[Architecture Guide](docs/ARCHITECTURE.md)** — Module structure, DI patterns, type safety

## License

MIT
