# Task 2: Create Chat Backend Module

## Objective

Create the chat backend module following the existing module pattern (repository, service, routes). Use in-memory stubs for Azure worker integration -- the real Azure calls come in task-5.

## Scope

- Create `server/modules/chat/` with full module structure
- Register in DI container and mount routes
- Worker stubs return mock responses (no Azure calls yet)

## Rules & Contracts

- `.chief/milestone-1/_contract/api-contract.md` -- route definitions and response shapes
- `.chief/_rules/_standard/module-checklist.md` -- module creation steps
- `.chief/_rules/_standard/coding-standards.md` -- patterns and conventions
- `CLAUDE.md` -- architectural patterns

## Steps

1. Create `server/modules/chat/chat.repository.ts`:
   - `IChatRepository` interface with methods: `createMessage`, `createWorkerResult`, `getWorkerResult`, `updateWorkerResult`
   - `PrismaChatRepository` implementation using Prisma client

2. Create `server/modules/chat/chat.service.ts`:
   - `ChatService` class with methods:
     - `sendMessage(message, workerType)` -- routes to stub worker
     - `handleCallback(jobId, result)` -- stores CAJ result
     - `getResult(jobId)` -- returns WorkerResult status
   - Worker stubs:
     - CAJ stub: create WorkerResult with status "pending", return jobId. Use setTimeout to simulate delayed callback (auto-complete after 5s for dev).
     - Session stub: return mock response with fake elapsed time

3. Create `server/modules/chat/chat.routes.ts`:
   - `createChatRoutes(container: ServiceContainer)` factory
   - `POST /api/chat` -- accepts `{ message: string }`, query `?worker=caj|session`
   - `POST /api/worker/callback/:jobId` -- accepts `{ result: string }`
   - `GET /api/worker/result/:jobId` -- returns WorkerResult
   - Use prismabox schemas for request/response validation where applicable
   - No auth (`withAuth` not used)

4. Create `server/modules/chat/chat.errors.ts`:
   - `WorkerResultNotFoundError`

5. Create `server/modules/chat/index.ts` -- barrel export

6. Update `server/context/app-context.ts`:
   - Add `chatService` to `ServiceContainer`
   - Wire `PrismaChatRepository` and `ChatService` in `createContainer()`

7. Update `server/index.ts`:
   - Import and mount `.use(createChatRoutes(container))`

## Acceptance Criteria

- All three API endpoints respond correctly
- `POST /api/chat?worker=session` returns mock response immediately
- `POST /api/chat?worker=caj` returns `{ jobId, status: "started" }`
- `POST /api/worker/callback/:jobId` stores result
- `GET /api/worker/result/:jobId` returns stored result
- Type check passes
- Tests pass (existing tests not broken)

## Verification

```bash
bunx tsc --noEmit
bun run test
```

## Deliverables

- New: `server/modules/chat/chat.repository.ts`
- New: `server/modules/chat/chat.service.ts`
- New: `server/modules/chat/chat.routes.ts`
- New: `server/modules/chat/chat.errors.ts`
- New: `server/modules/chat/index.ts`
- Modified: `server/context/app-context.ts`
- Modified: `server/index.ts`
