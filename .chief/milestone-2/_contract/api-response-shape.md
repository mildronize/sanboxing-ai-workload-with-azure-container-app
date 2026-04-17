# M2 API Response Shapes

## POST /api/chat (Session Path -- Synchronous)

Request body:
```json
{ "message": "...", "conversationId": "uuid-string" }
```

Response:
```json
{
  "reply": "Model's explanation text",
  "code": "print('hello')",
  "stdout": "hello\n",
  "workerType": "session",
  "elapsedMs": 180,
  "status": "done"
}
```

## POST /api/chat (CAJ Path -- Trigger)

Request body:
```json
{ "message": "...", "conversationId": "uuid-string" }
```

Response:
```json
{
  "jobId": "caj-...",
  "code": "print('hello')",
  "status": "started",
  "workerType": "caj"
}
```

## POST /api/worker/callback/:jobId (CAJ Worker Callback)

Request body:
```json
{ "stdout": "hello\n" }
```

Response:
```json
{ "status": "received" }
```

## GET /api/worker/result/:jobId (CAJ Poll)

Response:
```json
{
  "jobId": "caj-...",
  "status": "done",
  "stdout": "hello\n",
  "elapsedMs": 18000
}
```

Note: `status` values are `"pending"`, `"done"`, `"error"` (matching existing WorkerResult model). Session path always returns `"done"`. Goal.md Decision #9 shows `"completed"` for CAJ poll -- this contract overrides that to `"done"` for consistency with the Prisma model.

## Error Handling

- `generatePythonCode()` never throws. On failure it returns `{ code: "", reply: "error explanation" }`.
- Agent loop (session path): if all 5 iterations fail, return last code + stderr as stdout + model explanation as reply. No throw.
- CAJ path: single OpenAI call. If it fails, return error as reply with empty code. No throw.
```

## PythonLTS /executions API (Backend -> Session Pool)

Request:
```
POST ${POOL_ENDPOINT}/executions?identifier=${conversationId}
Body: { "code": "...", "timeoutInSeconds": 30, "executionType": "synchronous" }
```

Response:
```json
{
  "status": "Succeeded",
  "result": {
    "stdout": "...",
    "stderr": "...",
    "executionTimeInMilliseconds": 125
  }
}
```
