# Milestone 2: Replace OpenCode with Azure OpenAI SDK + PythonLTS

## Motivation

Milestone 1 ใช้ OpenCode CLI ใน CustomContainer session pool — ต้อง build image ใหญ่, cold start ช้า, cost สูง. Milestone 2 เปลี่ยนเป็น Azure OpenAI SDK (tool calling) ใน backend + PythonLTS session pool ที่ Microsoft manage ให้.

## What Changes

| Area | M1 (current) | M2 (target) |
|------|-------------|-------------|
| LLM integration | OpenCode CLI binary in worker | Azure OpenAI SDK in backend (gpt-4o-mini) |
| Code generation | OpenCode generates + runs code | Backend calls Azure OpenAI with `execute_python` tool |
| Session Pool type | CustomContainer (custom image) | PythonLTS (built-in, no image) |
| Session Pool API | Custom protocol | `/executions` endpoint (Microsoft API) |
| CAJ worker image | Node + OpenCode | Minimal Python (stdlib only) |
| OpenAI auth | API key via OpenCode | API key in backend (`AzureOpenAI` SDK) |
| Agent loop | None (OpenCode handled it) | Backend runs up to 5 iterations with self-correction |

## What Stays the Same

- Frontend: assistant-ui + `ExternalStoreRuntime` + worker toggle + polling
- Backend framework: Elysia, factory DI, Prisma, module structure
- Auth: Better Auth
- CI/CD: GitHub Actions
- Route structure: `POST /api/chat`, callback, polling

---

## Architecture

```
User --> Frontend --> POST /api/chat --> Backend (Elysia)
                                          |
                                          +-- Call Azure OpenAI (API key, gpt-4o-mini)
                                          +-- Model returns execute_python tool call
                                          +-- Extract Python code
                                          |
                                          +-- worker=session:
                                          |     POST code --> PythonLTS /executions --> stdout back
                                          |     (agent loop: up to 5 iterations, model can self-correct)
                                          |
                                          +-- worker=caj:
                                                One OpenAI call --> extract code --> trigger CAJ job
                                                (pass CODE as env var --> container runs it --> POSTs stdout back)
```

Both paths: Backend generates Python via Azure OpenAI. Difference is only **where** code executes.

---

## Key Decisions

### 1. Azure OpenAI Integration

- SDK: `openai` package, `AzureOpenAI` client class
- Auth: API key (not Managed Identity) -- already wired in Terraform
- Model: `gpt-4o-mini` deployment
- Stateless: ไม่ส่ง conversation history ไป Azure OpenAI -- แต่ละ message standalone

```typescript
import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: "2025-01-01-preview",
  deployment: "gpt-4o-mini",
});
```

### 2. Tool Definition

Model เรียก `execute_python` tool เมื่อต้องการ run code:

```typescript
const tools = [{
  type: "function" as const,
  function: {
    name: "execute_python",
    description: "Execute Python code in a secure sandbox and return stdout",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Python code to execute" },
      },
      required: ["code"],
    },
  },
}];
```

### 3. System Prompt

Aggressive prompt forcing tool use -- stored as config constant ไม่ hardcode ใน route handler.

### 4. Agent Loop (Session Path)

- Up to 5 iterations with self-correction
- Synchronous response, no streaming
- ถ้า model execute code แล้ว stderr กลับมา, ส่ง stderr กลับให้ model แก้
- หลัง 5 iterations ถ้ายัง fail: return last code + stderr + model's explanation
- Fail gracefully -- ไม่ throw error ไปหา frontend

### 5. Session Pool: PythonLTS

- Terraform เปลี่ยน `container_type` จาก `CustomContainer` เป็น `PythonLTS`
- ไม่มี custom image, ไม่มี Dockerfile, ไม่มี registry
- ใช้ built-in `/executions` API endpoint
- Reference: `ref/container-apps-dynamic-sessions-samples/`

```typescript
// POST ${POOL_ENDPOINT}/executions?identifier=${conversationId}
// Body: { code, timeoutInSeconds: 30, executionType: "synchronous" }
// Response: { result: { stdout, stderr, executionTimeInMilliseconds } }
```

### 6. Session Affinity (conversationId)

- Frontend generates `conversationId` (UUID) on mount, sent with every request
- Used as `identifier` in PythonLTS `/executions` -- same kernel across messages
- ไม่ใช้กับ CAJ

### 7. CAJ Worker (Simplified)

- Minimal Python container, **zero external dependencies** (stdlib only)
- Receives `CODE` env var, runs it with `python`
- Captures stdout, POSTs back to `CALLBACK_URL` via `urllib`
- ไม่มี OpenCode, ไม่มี Node, ไม่มี npm

### 8. CAJ Trigger

- Backend makes **one** Azure OpenAI call to generate code
- Dispatches code as `CODE` env var via existing Azure REST API trigger
- ไม่มี agent loop สำหรับ CAJ -- fire and forget

### 9. API Response Shape

Session path (synchronous):
```json
{ "reply": "...", "code": "...", "stdout": "...", "workerType": "session", "elapsedMs": 180 }
```

CAJ trigger (immediate):
```json
{ "jobId": "...", "code": "...", "status": "started", "workerType": "caj" }
```

CAJ poll:
```json
{ "jobId": "...", "status": "completed", "stdout": "...", "elapsedMs": 18000 }
```

### 10. Prisma Schema Changes

- Add nullable `code: String?` to `ChatMessage`
- Add nullable `stdout: String?` to `ChatMessage`
- `WorkerResult.result` field rename to `stdout`

### 11. Frontend Changes

- Render generated Python code + stdout as separate blocks
- No intermediate step indicators for session path (synchronous)
- CAJ path: show "started" status, poll for result (existing pattern)

### 12. Mock Mode

- Keep `useMockWorkers` for local dev
- Mock skips Azure OpenAI + PythonLTS + CAJ trigger
- Return fake code + stdout

---

## Success Criteria

1. `POST /api/chat?worker=session` calls Azure OpenAI, gets Python code via tool calling, executes in PythonLTS, returns code + stdout
2. Agent loop self-corrects up to 5 times when code fails
3. `POST /api/chat?worker=caj` generates code, triggers CAJ job with `CODE` env var, returns jobId
4. CAJ worker runs Python code, POSTs stdout back to callback
5. Frontend shows code + stdout blocks for both paths
6. Terraform deploys PythonLTS session pool (no custom image)
7. Mock mode works for local dev without Azure resources
8. All existing M1 functionality (auth, polling, UI) continues to work
