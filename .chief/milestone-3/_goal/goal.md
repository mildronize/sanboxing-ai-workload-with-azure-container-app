# Milestone 3: Production-Ready on Azure

## Motivation

Milestone 2 runs locally with SQLite and no auth on chat. For the conference demo, the app must deploy fully to Azure with a real database, user registration limits, and protected chat routes.

## What Changes

| Area | M2 (current) | M3 (target) |
|------|-------------|-------------|
| Database | SQLite via libsql adapter | PostgreSQL via `@prisma/adapter-pg` |
| Local DB | File-based `dev.db` | `docker-compose.yml` with PostgreSQL container |
| Chat auth | Public (no login required) | Requires login via Better Auth |
| User limit | Unlimited | `MAX_USERS` env var (default 30), 403 when full |
| Terraform | No database resource | Azure Database for PostgreSQL Flexible Server (B1MS) |
| DEPLOY.md | Local-only with ngrok | Two options: local+ngrok vs cloud-only |
| Better Auth provider | `sqlite` | `postgresql` |
| Prisma datasource | `provider = "sqlite"` | `provider = "postgresql"` |
| Connection string | `file:./dev.db` | `postgresql://user:pass@host:5432/db` |

## What Stays the Same

- Frontend: assistant-ui, chat UI, worker toggle, polling
- Backend framework: Elysia, factory DI, module structure
- Auth framework: Better Auth (email/password)
- CI/CD: GitHub Actions
- Route structure: `POST /api/chat`, callback, polling
- Worker: CAJ + PythonLTS paths unchanged
- Mock mode: still works for local dev without Azure

---

## Key Decisions

### 1. PostgreSQL Everywhere

- Prisma `datasource.provider` changes from `sqlite` to `postgresql`
- Replace `@prisma/adapter-libsql` + `@libsql/client` with `@prisma/adapter-pg` + `pg`
- `prisma.config.ts` datasource URL format: `postgresql://...`
- Local dev: PostgreSQL via docker-compose (port 5432)
- Production: Azure Database for PostgreSQL Flexible Server

### 2. Docker Compose (Local Dev Only)

- `docker-compose.yml` at repo root
- Contains only PostgreSQL service (no other services)
- Default credentials for local dev: `sandbox`/`sandbox`/`sandbox_dev`
- Port 5432 mapped to host

### 3. Auth Gate on Chat

- `/chat` route requires login
- Frontend: redirect to `/login` if not authenticated
- Backend: `POST /api/chat` uses `{ withAuth: true }` macro
- Existing auth plugin already supports this

### 4. Max Users Registration Limit

- `MAX_USERS` env var (default 30)
- Backend: check user count before registration, return 403 when full
- Frontend: signup page shows "Registration closed" when full
- Need a public endpoint to check registration status: `GET /api/auth/registration-status`

### 5. Azure PostgreSQL (Terraform)

- Azure Database for PostgreSQL Flexible Server
- SKU: Burstable B1MS (cheapest)
- Public access with firewall rule: "Allow Azure services" only
- Wire `DATABASE_URL` as secret env var to backend Container App
- Admin credentials as Terraform variables (sensitive)

### 6. DEPLOY.md Restructure

- Keep filename as `DEPLOY.md` (do NOT rename)
- Two deployment options:
  - **Option 1: Local backend + ngrok** (current approach, for development)
  - **Option 2: Cloud-only** (backend on Azure Container App, PostgreSQL on Azure)
- Shared prerequisites and Azure setup sections

---

## Success Criteria

1. `prisma/schema.prisma` uses `provider = "postgresql"`
2. `server/lib/prisma.ts` uses `@prisma/adapter-pg` instead of libsql
3. `docker-compose.yml` provides local PostgreSQL, `bun run db:push` works against it
4. `/chat` route requires authentication (redirect to login if not signed in)
5. `POST /api/chat` rejects unauthenticated requests (401)
6. `MAX_USERS=30` prevents new signups when user count reaches limit (403)
7. Frontend signup shows "Registration closed" when full
8. Terraform creates PostgreSQL Flexible Server and wires `DATABASE_URL` to backend
9. `DEPLOY.md` has two clear deployment options
10. `bunx tsc --noEmit`, `bun run test`, `bun run build` all pass
11. `terraform validate` and `terraform fmt -check` pass
