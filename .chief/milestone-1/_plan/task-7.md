# Task 7: Backend App Dockerfile

## Objective

Create a Dockerfile for the main backend application (Elysia + React SPA) to run as an Azure Container App.

## Scope

- Create root `Dockerfile` for the backend app
- Multi-stage build: install deps, build frontend, run server

## Steps

1. Create `Dockerfile` at repo root
2. Stage 1: Install dependencies (`bun install`)
3. Stage 2: Build frontend (`bun run build`)
4. Stage 3: Production image with built assets + server code
5. Create `.dockerignore`

## Acceptance Criteria

- `docker build -t demo-app .` succeeds
- Container starts and serves health check on port 3001

## Verification

```bash
docker build -t demo-app .
```

## Deliverables

- New: `Dockerfile`
- New: `.dockerignore`
