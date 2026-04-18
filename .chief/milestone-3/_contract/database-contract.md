# Database Contract (Milestone 3)

## PostgreSQL Configuration

### Local Development

```
DATABASE_URL="postgresql://sandbox:sandbox@localhost:5432/sandbox_dev"
```

### Production (Azure)

```
DATABASE_URL="postgresql://<admin_user>:<admin_password>@<server_name>.postgres.database.azure.com:5432/<db_name>?sslmode=require"
```

## Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
}
```

## Prisma Client Adapter

```typescript
// server/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
```

## Docker Compose (Local Dev)

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: sandbox
      POSTGRES_PASSWORD: sandbox
      POSTGRES_DB: sandbox_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Registration Limit API

```
GET /api/auth/registration-status
Response: { "registrationOpen": true, "currentUsers": 5, "maxUsers": 30 }
```

When registration is closed, `POST /api/auth/sign-up/email` returns 403 with:
```json
{ "error": "Registration is closed. Maximum number of users reached." }
```

## New Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://sandbox:sandbox@localhost:5432/sandbox_dev` | PostgreSQL connection string |
| `MAX_USERS` | `30` | Maximum allowed user registrations |

## Terraform Variables (New)

| Variable | Type | Sensitive | Description |
|----------|------|-----------|-------------|
| `db_admin_username` | string | No | PostgreSQL admin username |
| `db_admin_password` | string | Yes | PostgreSQL admin password |
| `better_auth_secret` | string | Yes | Better Auth secret key |
| `max_users` | number | No | Max allowed user registrations (default 30) |

## Backend Container App Env Vars (Terraform-Managed)

| Env Var | Source | Description |
|---------|--------|-------------|
| `DATABASE_URL` | Secret (constructed from PG server) | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret | Better Auth secret key |
| `BETTER_AUTH_URL` | Derived from backend FQDN | Better Auth base URL for production |
| `MAX_USERS` | Variable | Max user registrations |
