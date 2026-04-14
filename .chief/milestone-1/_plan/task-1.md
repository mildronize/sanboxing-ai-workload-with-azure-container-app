# Task 1: Add Prisma Models for Chat Feature

## Objective

Add `ChatMessage` and `WorkerResult` models to the Prisma schema and regenerate the client and prismabox schemas.

## Scope

- Modify `prisma/schema.prisma`
- Regenerate `generated/client/` and `generated/prismabox/`
- Push schema to SQLite

## Rules & Contracts

- `.chief/milestone-1/_contract/prisma-schema.md` -- exact model definitions
- `CLAUDE.md` -- types from Prisma, validation from prismabox
- `.chief/_rules/_standard/coding-standards.md`

## Steps

1. Add `ChatMessage` model to `prisma/schema.prisma` with fields: id, role, content, workerType, elapsedMs, jobId, createdAt, updatedAt
2. Add `WorkerResult` model with fields: id, jobId (unique), status, result, elapsedMs, createdAt, updatedAt
3. Run `bun run db:generate` to regenerate Prisma client + prismabox schemas
4. Run `bun run db:push` to push schema to SQLite

## Acceptance Criteria

- `ChatMessage` and `WorkerResult` models exist in schema.prisma
- `generated/prismabox/ChatMessage.ts` and `generated/prismabox/WorkerResult.ts` exist
- `generated/client/` contains updated types
- No existing models (User, Session, Account, Verification, Todo) are modified

## Verification

```bash
bun run db:generate
bun run db:push
bunx tsc --noEmit
```

## Deliverables

- Modified: `prisma/schema.prisma`
- Regenerated: `generated/client/`, `generated/prismabox/`
