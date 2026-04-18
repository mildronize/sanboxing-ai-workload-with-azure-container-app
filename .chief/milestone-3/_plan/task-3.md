# Task 3: Max Users Registration Limit

## Objective

Enforce a maximum number of registered users. When the limit is reached, new signups are rejected and the frontend shows a "Registration closed" message.

## Scope

**Included:**
- Backend: registration limit check (Better Auth hook or middleware)
- Backend: `GET /api/auth/registration-status` endpoint
- Frontend: `app/routes/signup.tsx` — check registration status, show message when closed
- `.env.example` — add `MAX_USERS`

**Excluded:**
- Database changes (task 1)
- Chat auth gate (task 2)

**Note:** Task 1 already modifies `.env.example` for `DATABASE_URL`. This task adds `MAX_USERS` to the same file.

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md`
- `.chief/milestone-3/_contract/database-contract.md` (registration status API shape)

## Steps

1. Add `MAX_USERS` to `.env.example` with default `30`
2. Create registration limit logic in auth setup:
   - In `server/lib/auth.ts`, add a Better Auth `before` hook on user creation
   - Count existing users via Prisma
   - If count >= `MAX_USERS`, throw/return 403
3. Add `GET /api/auth/registration-status` route:
   - Count users via Prisma
   - Return `{ registrationOpen: boolean, currentUsers: number, maxUsers: number }`
   - No auth required on this endpoint
4. Update `app/routes/signup.tsx`:
   - On mount, fetch `/api/auth/registration-status`
   - If `registrationOpen === false`, show "Registration closed" message instead of form
   - If open, show normal signup form

## Acceptance Criteria

- When user count < `MAX_USERS`, signup works normally
- When user count >= `MAX_USERS`, `POST /api/auth/sign-up/email` returns 403
- `GET /api/auth/registration-status` returns correct status
- Signup page shows "Registration closed" when limit reached
- `MAX_USERS` defaults to 30 when env var not set

## Verification

```bash
bunx tsc --noEmit
bun run build
bun run test
```

## Deliverables

- Modified: `server/lib/auth.ts`, `app/routes/signup.tsx`, `.env.example`
- May create: new route file or add to existing server setup for registration-status endpoint
