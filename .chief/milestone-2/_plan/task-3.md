# Task 3: PythonLTS Session Execution Client

## Objective

Replace the existing `sendToSession()` in `server/lib/azure.ts` with a PythonLTS `/executions` API client that sends Python code (not chat messages) and returns stdout/stderr.

## Scope

- Rewrite `sendToSession()` to use the PythonLTS `/executions` endpoint
- Accept `code` instead of `message`
- Accept `conversationId` as the `identifier` for session affinity
- Return `{ stdout, stderr, executionTimeInMilliseconds }`

## Files to Modify

- `server/lib/azure.ts` (rewrite `sendToSession`, update `SendToSessionParams` and result type)

## Rules & Contracts

- `.chief/milestone-2/_goal/goal.md` -- Decision #5 (PythonLTS API), Decision #6 (conversationId)
- `ref/container-apps-dynamic-sessions-samples/code-interpreter/python/api-spec-python.md` -- API contract

## Steps

1. Update `SendToSessionParams` to accept `code: string` and `conversationId: string` instead of `message`
2. Update `SendToSessionResult` to `{ stdout: string, stderr: string, executionTimeInMilliseconds: number }`
3. Rewrite `sendToSession()`:
   - POST to `${poolEndpoint}/executions?identifier=${conversationId}`
   - Body: `{ code, timeoutInSeconds: 30, executionType: "synchronous" }`
   - Parse response: `response.result.stdout`, `response.result.stderr`, `response.result.executionTimeInMilliseconds`
4. Keep `DefaultAzureCredential` with scope `https://dynamicsessions.io/.default` (same auth pattern as M1, already working in production)

## Acceptance Criteria

- `sendToSession()` posts code to `/executions` endpoint
- Uses `conversationId` as `identifier` query param
- Returns structured result with stdout, stderr, executionTimeInMilliseconds
- TypeScript compiles cleanly

## Verification

```bash
bunx tsc --noEmit
```

## Deliverables

- Updated `server/lib/azure.ts`
