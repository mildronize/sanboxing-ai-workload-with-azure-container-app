# Project Configuration

> Project-specific details referenced by the chief-agent framework.

## Development Commands

```bash
bun run dev              # Start frontend + backend concurrently
bun run dev:frontend     # Vite dev server (port 3000)
bun run dev:server       # Elysia backend with watch (port 3001)
bun run start            # Production server (single port 3001)
bun run build            # Build frontend
bun run build:all        # Build frontend + generate Prisma client
bun run db:generate      # Regenerate Prisma client + prismabox schemas
bun run db:push          # Push schema changes to SQLite
bun run db:studio        # Open Prisma Studio
bun run test             # Run Vitest
bunx tsc --noEmit        # Type check (use as verification after changes)
```

## Architecture Overview

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

This is a SPA (React + Vite) frontend with an Elysia (Bun) backend. Module-based architecture with end-to-end type safety from Prisma schema to frontend components.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TanStack Router, Tailwind CSS v4, shadcn/ui |
| API Client | Eden Treaty (type-safe RPC), React Query |
| Backend | Elysia (Bun runtime) |
| Auth | Better Auth (email/password) |
| ORM | Prisma v7 (SQLite via libsql adapter) |
| Validation | TypeBox (via Elysia + prismabox) |
| Logging | Pino |

### Key Architectural Patterns

- **Module-Based Backend**: Each domain lives in `server/modules/<name>/` with repository, service, routes, errors
- **Feature-Based Frontend**: Each feature lives in `app/features/<name>/` with components and hooks
- **Factory Container DI**: `createContainer()` wires all dependencies — no framework, no decorators
- **Auth Plugin**: Named Elysia plugin with `withAuth` macro — `.use(authPlugin)` in any module
- **Prismabox Validation**: TypeBox schemas auto-generated from Prisma schema — `t.Pick` / `t.Partial` for variants
- **Eden + React Query**: Type-safe RPC client with query/mutation hooks and cache invalidation

### Type Safety Chain

```
prisma/schema.prisma → Prisma Client (types) → prismabox (TypeBox schemas)
  → Elysia routes (validation) → Eden Treaty (RPC) → React Query hooks (frontend)
```

### Directory Structure

```
server/
  index.ts                         # Composition root
  context/app-context.ts           # AppContext, ServiceContainer, createContainer()
  lib/                             # prisma.ts, auth.ts, auth-plugin.ts
  infrastructure/logging/          # ILogger, PinoLogger, createLogger()
  modules/
    todo/                          # Domain module
      todo.repository.ts           # ITodoRepository + PrismaTodoRepository
      todo.service.ts              # Business logic
      todo.routes.ts               # Elysia route plugin
      todo.errors.ts               # Domain errors

app/                               # Frontend (Vite root)
  routes/                          # TanStack Router (thin)
  features/
    todo/                          # Feature module
      components/                  # TodoList, TodoItem, AddTodoForm
      hooks/useTodos.ts            # React Query + Eden hooks
  components/                      # Shared: Header, ThemeToggle, ui/ (shadcn)
  lib/                             # eden.ts, auth-client.ts, query-client.ts

prisma/schema.prisma               # Single source of truth
generated/                         # Auto-generated (client + prismabox)
```

### Important Development Rules

1. **Types from Prisma**: Never declare manual interfaces for Prisma-managed models. Use Prisma-generated types. Exception: data stored outside Prisma (external APIs, etc.)
2. **Validation from prismabox**: Never write manual `t.Object({...})` for model schemas. Import from `#generated/prismabox/` and use `t.Pick` / `t.Partial`.
3. **Frontend types from Eden**: Never duplicate server types on frontend. `Todo` type is derived from `Treaty.Data<>`.
4. **Auth via macro**: Use `{ withAuth: true }` on routes. Never inline auth checks in handlers.
5. **Logger via constructor**: Services/repos receive `appContext`, destructure `this.logger = appContext.logger`. Never use `console.log`.
6. **Container for DI**: Services are wired in `createContainer()`. Container is passed to route factories. Never use Elysia `.decorate()` for service injection.
7. **Module isolation**: Each backend module is self-contained in `server/modules/<name>/`. Routes are Elysia plugins mounted via `.use()`.
8. **Feature isolation**: Each frontend feature is self-contained in `app/features/<name>/`. Shared components stay in `app/components/`.
9. **Path aliases**: Use `#server/*` for server imports, `#generated/*` for generated code, `#/*` for frontend. Never use deep relative paths like `../../../`.
