# Architecture

## Tech Stack

| Layer      | Technology                                                  |
| ---------- | ----------------------------------------------------------- |
| Frontend   | React 19, Vite, TanStack Router, Tailwind CSS v4, shadcn/ui |
| API Client | Eden Treaty (type-safe RPC), React Query                    |
| Backend    | Elysia (Bun runtime)                                        |
| Auth       | Better Auth (email/password)                                |
| ORM        | Prisma v7 (SQLite via libsql adapter)                       |
| Validation | TypeBox (via Elysia + prismabox)                            |
| Logging    | Pino                                                        |

## Type Safety Chain

Single source of truth flows from Prisma schema through the entire stack:

```
prisma/schema.prisma
  |
  ├─ prisma generate ─────→ generated/client/     (TypeScript types: Todo, User, ...)
  ├─ prismabox generator ─→ generated/prismabox/  (TypeBox schemas: TodoPlain, TodoPlainInputCreate, ...)
  |
  │  Backend
  │  ├─ Repository uses ──→ Prisma types (Todo, Pick<Todo, ...>)
  │  ├─ Routes use ────────→ Prismabox schemas (body/response validation)
  │  └─ Elysia infers ────→ Route types (typeof baseApp)
  |
  │  Frontend
  │  ├─ Eden Treaty ───────→ Type-safe RPC client (inferred from App type)
  │  └─ React Query ───────→ Typed hooks (data, error, loading)
```

**Rules:**
- Never declare manual interfaces for Prisma-managed models — use Prisma-generated types. Exception: data stored outside Prisma (e.g. external APIs, file storage, cache) should have manually declared types
- Never write manual `t.Object({...})` for model validation — use prismabox schemas with `t.Pick` / `t.Partial`
- Frontend `Todo` type is derived from Eden's inferred return type, not manually declared

## Directory Structure

```
├── prisma/
│   └── schema.prisma              # Single source of truth for all types
├── generated/                     # Auto-generated, gitignored (except client)
│   ├── client/                    # Prisma Client (TypeScript types + query engine)
│   └── prismabox/                 # TypeBox schemas for Elysia validation
├── server/                        # Backend
│   ├── index.ts                   # Composition root — mounts modules, starts server
│   ├── context/
│   │   └── app-context.ts         # AppContext, ServiceContainer, createContainer()
│   ├── lib/
│   │   ├── prisma.ts              # PrismaClient singleton (with libsql adapter)
│   │   ├── auth.ts                # Better Auth config
│   │   └── auth-plugin.ts         # Elysia plugin: auth handler + withAuth macro
│   ├── infrastructure/
│   │   └── logging/               # ILogger, PinoLogger, createLogger()
│   └── modules/
│       └── todo/                  # Domain module (see Module Structure below)
├── app/                           # Frontend (Vite root)
│   ├── routes/                    # TanStack Router file-based routes (thin)
│   ├── features/
│   │   └── todo/                  # Feature module (see Feature Structure below)
│   ├── components/                # Shared layout + UI only
│   │   ├── Header.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ui/                    # shadcn/ui primitives
│   └── lib/                       # Shared utilities
│       ├── eden.ts                # Eden Treaty client
│       ├── auth-client.ts         # Better Auth React client
│       ├── query-client.ts        # React Query client
│       └── utils.ts               # cn() helper
├── docs/                          # Architecture docs
└── .chief/                        # Planning & task tracking
```

## Path Aliases

Configured in both `package.json` (`imports`) and `tsconfig.json` (`paths`):

| Alias | Resolves to | Usage |
|-------|------------|-------|
| `#server/*` | `./server/*` | Server-side imports: `import { prisma } from '#server/lib/prisma'` |
| `#generated/*` | `./generated/*` | Generated code: `import { TodoPlain } from '#generated/prismabox/Todo'` |
| `#/*` | `./app/*` | Frontend imports: `import { api } from '#/lib/eden'` |

Avoid relative paths like `../../../generated/` — always use aliases.

## Backend

### Module Structure

Each domain module is a self-contained folder under `server/modules/`:

```
server/modules/todo/
├── index.ts              # Barrel export
├── todo.repository.ts    # ITodoRepository interface + PrismaTodoRepository class
├── todo.service.ts       # TodoService (business logic)
├── todo.routes.ts        # Elysia route plugin (createTodoRoutes)
└── todo.errors.ts        # Domain-specific error classes
```

**When a module has multiple tables** (e.g. a `project` module with `project`, `project_member`, `project_label`):

```
server/modules/project/
├── index.ts
├── project.repository.ts          # 1 repo per table
├── project-member.repository.ts   # 1 repo per table
├── project-label.repository.ts    # 1 repo per table
├── project.service.ts             # 1 service orchestrates all repos
├── project.routes.ts
└── project.errors.ts
```

### Adding a New Module

1. Create `server/modules/<name>/` with repository, service, routes, errors
2. Types come from Prisma — add models to `schema.prisma`, run `prisma generate`
3. Route validation comes from prismabox — import from `generated/prismabox/<Model>.ts`
4. Create route factory: `export function create<Name>Routes(container: ServiceContainer)`
5. Register in `server/context/app-context.ts` — add to `ServiceContainer` and `createContainer()`
6. Mount in `server/index.ts` — `.use(create<Name>Routes(container))`

### Composition Root (`server/index.ts`)

The entry point has zero business logic. It only:

1. Creates the container (`createContainer()`)
2. Mounts global middleware (error logging)
3. Mounts modules (`.use(authPlugin)`, `.use(createTodoRoutes(container))`)
4. Starts the server

```ts
const container = createContainer()
const baseApp = new Elysia()
  .onError(...)
  .get('/api/health', () => ({ status: 'ok' }))
  .use(authPlugin)
  .use(createTodoRoutes(container))
```

### Dependency Injection

Factory container pattern — no framework, no decorators:

```ts
// server/context/app-context.ts
export interface AppContext {
  logger: ILogger
  config: AppConfig
}

export interface ServiceContainer {
  appContext: AppContext
  todoService: TodoService
}

export function createContainer(): ServiceContainer {
  const logger = createLogger({ environment })
  const appContext = { logger, config }
  const todoRepo = new PrismaTodoRepository(appContext, prisma)
  const todoService = new TodoService(appContext, todoRepo)
  return { appContext, todoService }
}
```

**Rules:**
- Services and repositories receive `appContext` in constructor, destructure `this.logger = appContext.logger`
- Container is passed to route factories, not decorated on Elysia
- Services depend on repository interfaces, not concrete classes

### Auth Plugin

Reusable named Elysia plugin. Any module that needs auth uses it:

```ts
// server/lib/auth-plugin.ts
export const authPlugin = new Elysia({ name: 'auth' })
  .mount(auth.handler)
  .macro({
    withAuth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401)
        return { user: session.user }
      },
    },
  })

// In module routes:
new Elysia({ prefix: '/api/todos' })
  .use(authPlugin)
  .get('/', handler, { withAuth: true })  // user available in context
```

Elysia deduplicates plugins by `name` — safe to `.use(authPlugin)` in multiple modules.

### Route Validation (Prismabox)

Route body/response schemas come from prismabox. Derive variants using `t.Pick` / `t.Partial`:

```ts
import { TodoPlain, TodoPlainInputCreate, TodoPlainInputUpdate } from '#generated/prismabox/Todo'

const CreateTodoBody = t.Pick(TodoPlainInputCreate, ['title', 'description'])
const UpdateTodoBody = TodoPlainInputUpdate

.post('/', handler, { body: CreateTodoBody, response: TodoPlain })
.patch('/:id', handler, { body: UpdateTodoBody, response: TodoPlain })
```

### Logging

Pino-based structured logging with environment-aware configuration:

- **Development:** pino-pretty (colorized, human-readable)
- **Production:** JSON (structured, machine-parseable)
- **Test:** silent

Services and repositories access logger via constructor:

```ts
class TodoService {
  private logger: ILogger

  constructor(appContext: AppContext, private repo: ITodoRepository) {
    this.logger = appContext.logger
  }
}
```

## Frontend

### Feature Structure

Each feature owns its components and hooks:

```
app/features/todo/
├── index.ts                       # Barrel export
├── components/
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   └── AddTodoForm.tsx
└── hooks/
    └── useTodos.ts                # useGetTodos, useCreateTodo, useUpdateTodo, useDeleteTodo
```

**Rules:**
- If only 1 feature uses it — lives in that feature folder
- If 2+ features use it — lives in shared `app/components/` or `app/lib/`
- `app/components/ui/` is always shared (shadcn primitives)

### Adding a New Feature

1. Create `app/features/<name>/` with components and hooks
2. Hooks use Eden client (`api.api.<resource>...`) + React Query
3. Types are inferred from Eden — never declare manual interfaces
4. Export via barrel `index.ts`
5. Import in routes: `import { ComponentName } from '#/features/<name>'`

### Eden + React Query Hooks

All API calls go through Eden Treaty + React Query. Pattern:

```ts
// app/features/todo/hooks/useTodos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '#/lib/eden'

export function useGetTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data, error } = await api.api.todos.get()
      if (error) throw error
      return data
    },
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => {
      const { data, error } = await api.api.todos.post(body)
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })
}
```

**Rules:**
- `queryKey` matches the resource name
- Mutations always invalidate related queries on success
- Error handling: `if (error) throw error` — React Query handles the rest
- Types flow from Eden, never declare them manually

### Routes

TanStack Router file-based routes. Routes are thin — they import from features:

```tsx
// app/routes/index.tsx
import { TodoList } from '#/features/todo'

function HomePage() {
  const { data: session } = useSession()
  if (session) return <TodoList />
  return <LandingPage />
}
```

## Dev vs Production

| Concern  | Development                  | Production                        |
| -------- | ---------------------------- | --------------------------------- |
| Frontend | Vite dev server (:3000)      | Built static files in `app/dist/` |
| Backend  | Elysia with --watch (:3001)  | Elysia serves API + static files  |
| Proxy    | Vite proxies `/api` → :3001  | Single origin, no proxy needed    |
| Run      | `bun run dev` (concurrently) | `bun run start`                   |
| Logging  | pino-pretty (colorized)      | JSON (structured)                 |
| Docker   | N/A                          | Multi-stage Dockerfile            |
