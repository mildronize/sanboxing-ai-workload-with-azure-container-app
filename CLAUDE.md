# CLAUDE.md

## Overview

This project uses a structured **Chief Agent Framework** to enable goal-driven autonomous development with minimal human intervention.

The system is designed so that:

* Humans define **direction, rules, and constraints**
* The **chief-agent** plans and orchestrates work
* Builder and tester agents execute and verify tasks
* The system progresses milestone by milestone with clear contracts and verification

The primary objective is to reduce human involvement in execution while maintaining correctness, safety, and alignment with project goals.

---

# `.chief` Directory Structure

The `.chief` directory contains all structured planning, rules, goals, and execution state.

```
.chief
├── _rules
│   ├── _contract
│   ├── _goal
│   ├── _verification
│   └── _standard
├── _template
└── milestone-1
    ├── _contract
    ├── _goal
    ├── _plan
    └── _report
```

Multiple milestones may exist.

A milestone can be:

* a simple numeric milestone (milestone-1, milestone-2)
* or a real ticket reference (e.g. `milestone-PROJ-1234`)

---

# Rules Hierarchy Priority

Rules must always be resolved using the following priority:

1. **CLAUDE.md** (highest authority)
2. `.chief/_rules`
3. `.chief/milestone-X/_goal` (lowest authority)

Example:
If CLAUDE.md states:

> "Do not use MongoDB ObjectId in service layer"

But `.chief/_rules` states:

> "MongoDB ObjectId may be used in some cases"

Then **CLAUDE.md always overrides**.

---

# Human vs AI Responsibilities

## Human Responsibilities

Humans focus primarily on:

* Writing and refining `CLAUDE.md`
* Maintaining `_rules`
* Defining goals clearly

Humans should not micromanage implementation details.

Clear rules and goals allow agents to work autonomously and safely.

## AI Responsibilities

AI agents must:

* Follow CLAUDE.md strictly
* Follow `.chief/_rules`
* Follow milestone goals and contracts
* Execute tasks safely and correctly
* Ask for clarification only when multiple valid paths exist

---

# `.chief/_rules` Directory

This directory defines global rules that apply to all milestones.

It contains four subfolders:

### `_standard`

General rules shared across all milestones:

* coding standards
* security policies
* database access rules
* architectural constraints

### `_goal`

General high-level goals shared across milestones.

### `_contract`

Shared system contracts:

* data models
* API contracts
* schema definitions
* system conventions

### `_verification`

Defines how work must be verified:

* test commands
* build requirements
* lint/type requirements
* definition of done

### Writing style rules for all rule files

All markdown inside `_rules` must be:

* concise
* structural
* clear
* not overly verbose
* include small code examples when useful
* eliminate ambiguity

Anything unclear may lead to incorrect autonomous decisions.

---

# `.chief/milestone-X` Directory

Each milestone has its own directory.

```
milestone-X
├── _contract
├── _goal
├── _plan
└── _report
```

## `_contract`

Milestone-specific contracts.
May be more detailed than global contracts, but must never conflict with them.

Examples:

* API schema for this milestone
* DB schema
* service boundaries

## `_goal`

Milestone-specific goals.
More detailed than global goals but must not conflict.

## `_plan`

Execution plan and task list for this milestone.

## `_report`

Reference material produced during the milestone. Examples: bug investigation reports, diagnostic reports, review results, performance analyses, task output folders. Not plans, contracts, or goals -- just reference documents.

---

# `.chief/milestone-X/_plan` Directory

Contains planning and execution tracking.

### Files

* `_todo.md` → main checklist for milestone
* `task-1.md`, `task-2.md`, etc → detailed task specs

### `_todo.md` Example

```md
# TODO List for Milestone X

- [ ] task-1: implement authentication module
- [ ] task-2: set up database schema
- [ ] task-3: write unit tests for user service
```

Chief-agent must update `_todo.md` by marking completed tasks:

```
[x]
```

Tasks should be kept small and clear.

## Task Output

Each task can have file output when needed, the output should be placed at `.chief/milestone-X/_report/task-Y/`

---

# CLAUDE.md Purpose

CLAUDE.md is the highest authority file.

It should NOT contain excessive detail.

It should contain:

* system overview
* architecture overview
* important rules
* tech stack
* directory structure
* how to run/test

Detailed rules belong in `.chief/_rules`.

---

# 3-Agent Architecture

## 1. Chief-Agent (Planner / Orchestrator)

The decision-making brain.

Responsibilities:

- Read `CLAUDE.md`
- Read global rules under `.chief/_rules`
- Analyze milestone goals and contracts
- Create and maintain `_plan`
- Break work into small tasks (3–5 at a time)
- Delegate implementation to builder-agent
- Delegate long-running validation to tester-agent
- Update `_todo.md`
- Decide next steps

Chief-agent resolves ambiguity, ensures rule compliance, and minimizes unnecessary human intervention.

---

## 2. Builder-Agent (Implementer)

The fast execution engine.

Responsibilities:

- Implement tasks defined in `.chief/<milestone>/_plan/task-X.md`
- Follow `.chief/_rules/_standard`
- Fix type/lint/test fallout autonomously
- Run short deterministic verification commands
- Commit code after verification passes

Builder-agent handles:

- Unit tests
- Type checks
- Lint
- Local deterministic build verification

Builder-agent does NOT:

- Perform external acceptance testing
- Validate real environments
- Make architecture decisions
- Modify contracts unless explicitly allowed

---

## 3. Tester-Agent (Long-Running Verifier)

The integration and stability validator.

Responsibilities:

- Execute long-running or non-deterministic tests
- Validate UI flows
- Validate API integrations
- Validate authentication flows (e.g. Entra)
- Perform integration and end-to-end testing
- Validate environment-level behavior

Tester-agent does NOT:

- Implement code
- Patch bugs
- Refactor systems

Tester-agent reports findings back to chief-agent for decision.

---

# Responsibility Separation

| Responsibility Type        | Builder-Agent | Tester-Agent |
|----------------------------|---------------|--------------|
| Unit tests                 | ✅            | ❌           |
| Type/lint/build checks     | ✅            | ❌           |
| Integration testing        | ❌            | ✅           |
| UI testing                 | ❌            | ✅           |
| External auth validation   | ❌            | ✅           |
| Cloud/environment checks   | ❌            | ✅           |
| Code fixes                 | ✅            | ❌           |
| Architecture decisions     | ❌            | ❌ (Chief)   |

This separation prevents slow loops and keeps execution stable.

---

# Core Design Philosophy

This system is designed so that:

Human defines direction →
Chief-agent plans →
Builder builds →
Tester verifies →
Chief decides →
Repeat

Minimal human intervention.
Maximum clarity and safety.

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
