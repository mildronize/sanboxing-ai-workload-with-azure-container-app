# Task 4: Agent Loop + Chat Service Rewrite (Session Path)

## Objective

Rewrite `ChatService.sendToSession()` to implement the M2 flow: call Azure OpenAI to generate Python code via tool calling, execute it in PythonLTS, and implement the agent loop with up to 5 self-correction iterations.

## Scope

- Rewrite the session path in `chat.service.ts`
- Wire the OpenAI client into the service container
- Implement agent loop: call OpenAI -> get code -> execute in PythonLTS -> if stderr, send error back to model -> retry up to 5 times
- Store `code` and `stdout` in ChatMessage
- Update `SendMessageResult` to include `code` and `stdout` fields

## Files to Modify

- `server/modules/chat/chat.service.ts` (major rewrite of session path)
- `server/context/app-context.ts` (add OpenAI client to container or config)

## Dependencies

- Task 1 (schema has `code` and `stdout` fields)
- Task 2 (OpenAI client exists)
- Task 3 (PythonLTS client exists)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md` -- logger, DI, no console.log
- `.chief/milestone-2/_goal/goal.md` -- Decision #4 (agent loop), Decision #9 (response shape)
- `.chief/milestone-2/_contract/api-response-shape.md` -- authoritative response shapes and error handling

## Steps

1. Update `AppConfig` or `ServiceContainer` to include the OpenAI client
2. Update `SendMessageResult`: add `code?: string`, `stdout?: string`, `reply?: string`. For the session path, `code` and `stdout` will always be populated. They remain optional on the type because the CAJ path uses a different subset of fields.
3. Rewrite `sendToSession()`:
   a. Accept `conversationId` parameter
   b. Call `generatePythonCode(message)` from openai.ts
   c. Call `sendToSession(code, conversationId)` from azure.ts
   d. If stderr is non-empty, send stderr back to OpenAI as a follow-up for self-correction
   e. Loop up to 5 iterations
   f. After loop: return `{ reply, code, stdout, workerType: "session", elapsedMs, status: "done" }`
4. Update mock mode to return fake code + stdout
5. Store `code` and `stdout` in the ChatMessage record
6. Update `sendMessage()` to pass `conversationId` to session path

## Acceptance Criteria

- Session path calls Azure OpenAI, gets code, executes in PythonLTS
- Agent loop retries up to 5 times on stderr
- After max retries, returns last code + stderr as `stdout` field + model explanation as `reply` (no throw)
- Mock mode returns fake `code` and `stdout`
- ChatMessage stored with `code` and `stdout` fields
- Response matches Decision #9 shape

## Verification

```bash
bunx tsc --noEmit
bun run test
```

## Deliverables

- Updated `server/modules/chat/chat.service.ts`
- Updated `server/context/app-context.ts`
