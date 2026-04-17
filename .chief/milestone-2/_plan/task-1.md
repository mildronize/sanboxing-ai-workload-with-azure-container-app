# Task 1: Prisma Schema Changes + Regenerate

## Objective

Update Prisma schema to support M2 data model: add `code` and `stdout` fields to `ChatMessage`, rename `WorkerResult.result` to `stdout`. Regenerate Prisma client and prismabox schemas.

## Scope

- Modify `prisma/schema.prisma`
- Run `bun run db:generate`
- Fix any type errors caused by the rename in existing code

## Files to Modify

- `prisma/schema.prisma`
- `server/modules/chat/chat.repository.ts` (update `result` references to `stdout`)
- `server/modules/chat/chat.service.ts` (update `result` references to `stdout`)
- `server/modules/chat/chat.routes.ts` (update `result` references to `stdout`)
- `app/features/chat/hooks/useChat.ts` (update `result` references to `stdout`)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md` -- types from Prisma
- `.chief/_rules/_standard/module-checklist.md` -- regenerate after schema change
- `.chief/milestone-2/_goal/goal.md` -- Decision #10

## Steps

1. Add `code String?` field to `ChatMessage` model
2. Add `stdout String?` field to `ChatMessage` model
3. Rename `WorkerResult.result` to `stdout`
4. Run `bun run db:generate`
5. Update all code references from `.result` to `.stdout` on WorkerResult
6. Update `CreateMessageData` type to include `code` and `stdout`
7. Run type check to verify

## Acceptance Criteria

- Schema has `code` and `stdout` on `ChatMessage`
- `WorkerResult` uses `stdout` instead of `result`
- All existing code compiles with no type errors
- `bun run db:generate` succeeds

## Verification

```bash
bun run db:generate
bunx tsc --noEmit
```

## Deliverables

- Updated `prisma/schema.prisma`
- Updated repository, service, routes, and frontend hook files
- Regenerated `generated/` directory
