# Task 2: Add Auth Gate on Chat Route

## Objective

Require authentication to access the `/chat` route. Unauthenticated users are redirected to `/login`.

## Scope

**Included:**
- `app/routes/chat.tsx` — add auth check, redirect to `/login` if not authenticated
- `server/modules/chat/chat.routes.ts` — add `{ withAuth: true }` to `POST /api/chat`
- Update coding standards to reflect chat now requires auth

**Excluded:**
- Max users logic (task 3)
- Database changes (task 1)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md` (auth via macro rule)
- `.chief/_rules/_contract/api-conventions.md` (update chat route auth column)

## Steps

1. Update `app/routes/chat.tsx`:
   - Import `useSession` from `#/lib/auth-client`
   - Check session status; if not authenticated, redirect to `/login`
   - Show loading state while session is being checked
2. Update `POST /api/chat` route in chat module:
   - Add `{ withAuth: true }` to the route config
   - This uses the existing `authPlugin` macro — no custom code needed
3. Update `.chief/_rules/_standard/coding-standards.md`:
   - Remove "No auth on chat routes" line under Chat Feature Specifics
   - Replace with "Chat routes require auth via `{ withAuth: true }` macro"
4. Update `.chief/_rules/_contract/api-conventions.md`:
   - Change `POST /api/chat` Auth column from "None" to "Required"

## Acceptance Criteria

- Visiting `/chat` without login redirects to `/login`
- `POST /api/chat` returns 401 without valid session
- After login, `/chat` works normally
- Existing auth flow (login/signup) continues to work

## Verification

```bash
bunx tsc --noEmit
bun run build
bun run test
```

## Deliverables

- Modified: `app/routes/chat.tsx`, chat routes file, `.chief/_rules/_standard/coding-standards.md`, `.chief/_rules/_contract/api-conventions.md`
