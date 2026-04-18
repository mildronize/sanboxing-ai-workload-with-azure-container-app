# Task 1: Switch Prisma from SQLite to PostgreSQL

## Objective

Replace SQLite/libsql with PostgreSQL as the database provider across the entire codebase.

## Scope

**Included:**
- `prisma/schema.prisma` — change `provider = "sqlite"` to `provider = "postgresql"`
- `prisma.config.ts` — update default datasource URL
- `server/lib/prisma.ts` — replace `@prisma/adapter-libsql` with `@prisma/adapter-pg`
- `server/lib/auth.ts` — change Better Auth adapter provider from `"sqlite"` to `"postgresql"`
- `package.json` — remove `@prisma/adapter-libsql` + `@libsql/client`, add `@prisma/adapter-pg` + `pg` + `@types/pg`
- `.env.example` — update `DATABASE_URL` to PostgreSQL format
- `docker-compose.yml` — create at repo root with PostgreSQL service

**Excluded:**
- Terraform changes (task 4)
- Auth logic changes (tasks 2-3)
- DEPLOY.md changes (task 5)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md`
- `.chief/milestone-3/_contract/database-contract.md`
- `.chief/_rules/_verification/definition-of-done.md`

## Steps

1. Update `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`
2. Update `prisma.config.ts`: change default URL to `postgresql://sandbox:sandbox@localhost:5432/sandbox_dev`
3. Rewrite `server/lib/prisma.ts`:
   - Remove `@prisma/adapter-libsql` import
   - Import `PrismaPg` from `@prisma/adapter-pg` and `pg`
   - Create `pg.Pool` with `DATABASE_URL`
   - Pass `PrismaPg` adapter to `PrismaClient`
4. Update `server/lib/auth.ts`: change `provider: "sqlite"` to `provider: "postgresql"`
5. Update `package.json` dependencies:
   - Remove: `@prisma/adapter-libsql`, `@libsql/client`
   - Add: `@prisma/adapter-pg`, `pg`
   - Add devDep: `@types/pg`
6. Run `bun install`
7. Create `docker-compose.yml` at repo root (PostgreSQL 17-alpine only)
8. Update `.env.example` with PostgreSQL `DATABASE_URL`
9. Add `docker-compose.yml` volumes to `.gitignore` if needed
10. Run `bun run db:generate` to regenerate Prisma client
11. Update `db:push` script in `package.json` if needed (should work as-is with PostgreSQL URL)

## Acceptance Criteria

- `prisma/schema.prisma` has `provider = "postgresql"`
- `server/lib/prisma.ts` uses `PrismaPg` adapter with `pg.Pool`
- `server/lib/auth.ts` has `provider: "postgresql"`
- `docker-compose.yml` exists at repo root with PostgreSQL service
- `.env.example` shows PostgreSQL connection string
- No references to `libsql` or `sqlite` remain in application code (schema, server/lib)

## Verification

```bash
bunx tsc --noEmit
bun run build
bun run test
```

## Deliverables

- Modified: `prisma/schema.prisma`, `prisma.config.ts`, `server/lib/prisma.ts`, `server/lib/auth.ts`, `package.json`, `.env.example`
- Created: `docker-compose.yml`
