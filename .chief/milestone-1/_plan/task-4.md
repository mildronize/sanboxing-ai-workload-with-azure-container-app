# Task 4: Build Worker Container Image

## Objective

Create the worker container that runs OpenCode in both CAJ (job) and Dynamic Session (session) modes.

## Scope

- Create `worker/` directory with Dockerfile, entrypoint.sh, server.ts, opencode config
- Single image, `MODE` env var switches behavior

## Rules & Contracts

- `.chief/milestone-1/_contract/worker-contract.md` -- full specification

## Steps

1. Create `worker/Dockerfile` -- node:22-alpine, install opencode-ai globally, install jq + curl
2. Create `worker/entrypoint.sh` -- mode switch: job mode runs opencode + callback POST, session mode starts HTTP server
3. Create `worker/server.ts` -- Bun HTTP server on TARGET_PORT (default 8080), POST /chat endpoint wrapping opencode CLI
4. Create `worker/opencode-config/` -- pre-configured OpenCode settings for GPT-5.4

## Acceptance Criteria

- `docker build -t demo-worker ./worker` succeeds
- Container starts in session mode by default
- With `MODE=job`, container runs opencode and exits

## Verification

```bash
docker build -t demo-worker ./worker
```

## Deliverables

- New: `worker/Dockerfile`
- New: `worker/entrypoint.sh`
- New: `worker/server.ts`
- New: `worker/opencode-config/`
