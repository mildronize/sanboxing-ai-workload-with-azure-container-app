# Todo App Template — SPA + Elysia + Prisma Stack

A production-ready **Todo Application Template** built with React SPA, Elysia backend, and Prisma ORM. Implements module-based architecture with end-to-end type safety from database schema to frontend components. Serves as a foundation for building scalable full-stack applications with authentication, CRUD operations, and structured logging.

## Features

- **Authentication** — Better Auth with email/password and session management
- **Todo Management** — Full CRUD with filtering (all/pending/completed)
- **End-to-End Type Safety** — Prisma schema drives types through the entire stack via Eden Treaty
- **Module Architecture** — Domain-centric backend modules, feature-based frontend organization
- **Auto-Generated Validation** — Prismabox generates TypeBox schemas from Prisma models
- **Structured Logging** — Pino with pretty-print in dev, JSON in production
- **Production Ready** — Single-server production mode with Dockerfile

## Tech Stack

### Backend & API
- **[Elysia](https://elysiajs.com)** — Type-safe web framework on Bun runtime
- **[Prisma v7](https://prisma.io)** — ORM with SQLite (libsql adapter for Bun)
- **[Better Auth](https://better-auth.com)** — Authentication library
- **[Prismabox](https://github.com/prismabox/prismabox)** — Auto-generate TypeBox schemas from Prisma
- **[Pino](https://getpino.io)** — Structured logging

### Frontend & UI
- **[React 19](https://react.dev)** — UI library with Vite bundler
- **[TanStack Router](https://tanstack.com/router)** — File-based routing
- **[Eden Treaty](https://elysiajs.com/eden)** — Type-safe RPC client for Elysia
- **[React Query](https://tanstack.com/query)** — Data fetching and cache management
- **[shadcn/ui](https://ui.shadcn.com)** — Component library on Radix + Tailwind CSS v4

## Architecture

This template implements a **Module-Based Architecture** with a type safety chain:

```
prisma/schema.prisma (single source of truth)
  -> Prisma Client (TypeScript types)
  -> Prismabox (TypeBox validation schemas)
  -> Elysia routes (body/response validation)
  -> Eden Treaty (type-safe frontend RPC)
  -> React Query hooks (typed data fetching)
```

### Project Structure

```
server/                            # Backend
  index.ts                         # Composition root — mounts modules, starts server
  context/app-context.ts           # DI container factory
  lib/                             # Auth config, Prisma client, auth plugin
  infrastructure/logging/          # ILogger, PinoLogger, factory
  modules/
    todo/                          # Domain module
      todo.repository.ts           # Interface + Prisma implementation
      todo.service.ts              # Business logic
      todo.routes.ts               # Elysia route plugin
      todo.errors.ts               # Domain errors

app/                               # Frontend (Vite root)
  routes/                          # TanStack Router (thin, imports from features)
  features/
    todo/                          # Feature module
      components/                  # TodoList, TodoItem, AddTodoForm
      hooks/useTodos.ts            # React Query + Eden hooks
  components/                      # Shared: Header, ThemeToggle, ui/ (shadcn)
  lib/                             # Eden client, auth client, query client

prisma/schema.prisma               # Database schema + prismabox generator
generated/                         # Auto-generated Prisma client + TypeBox schemas
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation including patterns, conventions, and guides for adding new modules.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.3+

### 1. Clone and Install

```bash
git clone <repository-url> my-todo-app
cd my-todo-app
bun install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Configure `.env`:

```env
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3001"
```

### 3. Set Up Database

```bash
bun run db:push
```

### 4. Start Development

```bash
bun run dev
```

This starts both frontend (http://localhost:3000) and backend (http://localhost:3001) concurrently. Sign up, then start adding todos.

## Development Commands

```bash
# Development
bun run dev              # Start frontend + backend (concurrently)
bun run dev:frontend     # Start Vite dev server only (port 3000)
bun run dev:server       # Start Elysia backend only with watch (port 3001)

# Build
bun run build            # Build frontend
bun run build:all        # Build frontend + generate Prisma client

# Production
bun run start            # Start production server (single port 3001)

# Database
bun run db:generate      # Regenerate Prisma client + prismabox schemas
bun run db:push          # Push schema changes to database
bun run db:studio        # Open Prisma Studio

# Testing
bun run test             # Run tests with Vitest
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 chars in production) | — |
| `BETTER_AUTH_URL` | Backend URL for auth | `http://localhost:3001` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |

## Key Patterns

### Adding a New Backend Module

1. Add models to `prisma/schema.prisma`, run `bun run db:generate`
2. Create `server/modules/<name>/` with repository, service, routes, errors
3. Import prismabox schemas for route validation (`generated/prismabox/<Model>.ts`)
4. Register service in `server/context/app-context.ts`
5. Mount routes in `server/index.ts`: `.use(create<Name>Routes(container))`

### Adding a New Frontend Feature

1. Create `app/features/<name>/` with components and hooks
2. Hooks use Eden client + React Query (types inferred from server)
3. Export via barrel `index.ts`
4. Import in routes: `import { Component } from '#/features/<name>'`

### Type Rules

- Database model types come from Prisma — never declare manual interfaces
- Route validation schemas come from prismabox — never write manual `t.Object()`
- Frontend types are inferred from Eden — never duplicate server types

## Deployment

### Docker

```bash
docker build -t todo-app .
docker run -p 3001:3001 todo-app
```

The Dockerfile uses multi-stage builds: install deps, build frontend + Prisma, run single Elysia server serving both API and static files.

### Production Environment

```env
NODE_ENV="production"
DATABASE_URL="file:./prod.db"
BETTER_AUTH_SECRET="secure-production-secret-at-least-32-chars"
BETTER_AUTH_URL="https://yourdomain.com"
```

## Claude Code / Chief Agent Framework

This template ships with a **[Chief Agent Framework](https://github.com/thaitype/chief-agent-framework)** for AI-driven development using [Claude Code](https://claude.ai/code). It includes:

- **`.chief/`** — Planning, milestones, task specs, and rules for autonomous agent execution
- **`CLAUDE.md`** — Project rules, architecture context, and development commands that Claude reads

If you use Claude Code, the chief-agent will read these files to plan and execute work autonomously.

If you don't use Claude Code or prefer your own setup, remove them:

```bash
rm -rf .chief .claude
rm CLAUDE.md
# Optionally create your own CLAUDE.md with your project context
```

The application code is fully independent of the framework.

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** — Module structure, DI patterns, type safety chain
- **[CLAUDE.md](CLAUDE.md)** — AI development guidelines and chief-agent framework

## License

This project is licensed under the MIT License.
