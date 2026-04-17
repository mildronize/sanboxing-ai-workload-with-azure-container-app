# Task 6: Chat Routes + API Response Shape Update

## Objective

Update chat routes to accept `conversationId` from the frontend and return the new M2 response shape with `code`, `stdout`, and `reply` fields.

## Scope

- Add `conversationId` to POST `/api/chat` request body
- Update response types to match Decision #9
- Update callback route to accept `stdout` instead of `result`
- Update poll route to return `stdout` instead of `result`

## Files to Modify

- `server/modules/chat/chat.routes.ts`

## Dependencies

- Task 1 (schema rename)
- Task 4 (service returns new shape)
- Task 5 (service returns new shape)

## Note

This task also covers the callback handler update (originally task-10). The callback route body changes from `{ result }` to `{ stdout }`, and `handleCallback()` signature updates accordingly.

## Rules & Contracts

- `.chief/_rules/_contract/api-conventions.md`
- `.chief/milestone-2/_goal/goal.md` -- Decision #6 (conversationId), Decision #9 (response shape)

## Steps

1. Add `conversationId: t.String()` to POST `/api/chat` body schema (required -- frontend always sends it)
2. Pass `conversationId` to `chatService.sendMessage()`
3. Update callback route body schema: `result` -> `stdout`
4. Update `handleCallback()` in chat service: parameter `result` -> `stdout`, update mock callback too
5. Update poll route response: `result` -> `stdout`
5. Ensure response shape matches:
   - Session: `{ reply, code, stdout, workerType, elapsedMs, status }`
   - CAJ trigger: `{ jobId, code, status, workerType }`
   - CAJ poll: `{ jobId, status, stdout, elapsedMs }`

## Acceptance Criteria

- Routes accept `conversationId`
- Response shapes match Decision #9
- Callback uses `stdout`
- TypeScript compiles

## Verification

```bash
bunx tsc --noEmit
```

## Deliverables

- Updated `server/modules/chat/chat.routes.ts`
