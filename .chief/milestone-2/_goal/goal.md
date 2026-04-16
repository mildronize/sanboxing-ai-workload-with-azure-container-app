# Design Spec: Sandbox AI Workload Demo App (v4)

## Core Message

Azure Container Apps แก้ 3 ปัญหาหลักของการรัน AI-generated code:

1. **Security** — Hyper-V isolated per session, code ไม่แตะ production infra
2. **Cost** — $0.03/session-hour, consumption-based, scale to zero
3. **Infra management** — Microsoft จัดการ pool, scaling, lifecycle ทั้งหมด

## What We're Building

Chat UI demo สำหรับ Azure Global: _"Sandboxing AI Workloads on Azure Container Apps"_

```
Chat UI → Backend API (Bun + Azure OpenAI gpt-4o-mini)
               ├── CAJ Worker          (long-running, cold start, destroyed after done)
               └── Code Interpreter    (PythonLTS, Hyper-V isolated, $0.03/session-hr)
                   Session Pool
```

> **Note:** ใช้ `gpt-4o-mini` (Azure OpenAI deployment name `gpt-4o-mini`) — ไม่ใช่ OpenCode CLI อีกต่อไป Backend เรียก Azure OpenAI SDK โดยตรง

## Architecture

```
┌─────────────────────────────────┐
│  React Chat UI                  │
│  assistant-ui + Vite            │
└──────────┬──────────────────────┘
           │ HTTP
           ▼
┌──────────────────────────────────────┐
│  Backend API (Bun + Hono)            │
│  Azure OpenAI gpt-4o-mini            │
│  1. Receive user message             │
│  2. Call Azure OpenAI (tool calling) │
│  3. Model generates Python code      │
│  4. POST code → Session Pool         │
│  5. Return result + stdout to UI     │
└──────┬───────────────┬───────────────┘
       │               │
       ▼               ▼
┌────────────┐  ┌───────────────────────────┐
│ CAJ Worker │  │ Code Interpreter          │
│            │  │ Session Pool (PythonLTS)  │
│ long task  │  │                           │
│ cold start │  │ POST /executions          │
│ ~10–30s    │  │   ?identifier=<conv-id>   │
│ destroyed  │  │ { code: "..." }           │
│ after done │  │                           │
│            │  │ Jupyter kernel inside     │
│            │  │ Hyper-V isolated          │
│            │  │ numpy/pandas preloaded    │
│            │  │ instant start (pre-warm)  │
│            │  │ $0.03/session-hour        │
└────────────┘  └───────────────────────────┘
```

## Backend: Azure OpenAI Integration (Bun)

ใช้ Azure OpenAI SDK พร้อม tool calling — model decide เองว่าจะ generate Python code หรือตอบ text ตรงๆ

```typescript
import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const credential = new DefaultAzureCredential();
const azureADTokenProvider = getBearerTokenProvider(
  credential,
  "https://cognitiveservices.azure.com/.default"
);

const client = new AzureOpenAI({
  azureADTokenProvider,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: "2025-01-01-preview",
  deployment: "gpt-4o-mini",
});

// Tool definition — model calls this when it wants to run code
const tools = [
  {
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
  },
];
```

## Backend: Dynamic Session Call (Bun)

```typescript
async function executeInSession(code: string, conversationId: string) {
  // Get token for dynamic sessions
  const tokenResponse = await credential.getToken(
    "https://dynamicsessions.io/.default"
  );

  const res = await fetch(
    `${process.env.POOL_ENDPOINT}/executions?identifier=${conversationId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        timeoutInSeconds: 30,
        executionType: "synchronous",
      }),
    }
  );

  const data = await res.json();
  return {
    stdout: data.result.stdout,
    stderr: data.result.stderr,
    elapsedMs: data.result.executionTimeInMilliseconds,
  };
}
```

## Backend: Agent Loop (Bun)

```typescript
app.post("/api/chat", async (c) => {
  const { message, conversationId, worker } = await c.req.json();

  if (worker === "caj") {
    // Trigger CAJ job — return jobId immediately
    const jobId = await triggerCAJJob(message);
    return c.json({ jobId, status: "started" });
  }

  // Dynamic Session path — agentic loop
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant. When asked to analyze data or perform calculations, write Python code and use the execute_python tool.",
    },
    { role: "user", content: message },
  ];

  let response = await client.chat.completions.create({ model: "gpt-4o-mini", messages, tools });

  // Handle tool call if model wants to run code
  if (response.choices[0].finish_reason === "tool_calls") {
    const toolCall = response.choices[0].message.tool_calls![0];
    const { code } = JSON.parse(toolCall.function.arguments);

    const result = await executeInSession(code, conversationId);

    // Second pass — model formats the result
    messages.push(response.choices[0].message);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result.stdout,
    });

    response = await client.chat.completions.create({ model: "gpt-4o-mini", messages });
  }

  return c.json({
    reply: response.choices[0].message.content,
    worker: "dynamic-session",
    elapsedMs: /* from session result */,
  });
});
```

## Session Pool Config

```bash
az containerapp sessionpool create \
  --name demo-session-pool \
  --container-type PythonLTS \
  --max-sessions 100 \
  --cooldown-period 300
```

ไม่มี custom image, ไม่มี Dockerfile, ไม่มี registry

## Demo Flow (25 min)

**Minute 0** — Presenter พิมพ์ _"Analyze Azure Container Apps adoption and write a report"_ → trigger **CAJ** (cold start ~15-30s ตั้งใจให้ช้า)

**Minutes 1–12** — Architecture slides ขณะ CAJ รัน background

**Minutes 12–20** — Live chat ผ่าน **Code Interpreter Session** — gpt-4o-mini เรียก `execute_python` tool → Bun POST `/executions` → stdout กลับมาใน milliseconds

**Minute ~18** — CAJ result pop เข้า chat

**Minutes 20–25** — Decision matrix, Q&A

## UI Badge

```
⚡ Dynamic Session | 180ms | Hyper-V | $0.03/hr
⏳ CAJ             | cold start: 18s | destroyed after
```

## Azure Resources

| Resource                                  | Purpose                             |
| ----------------------------------------- | ----------------------------------- |
| Container Apps Environment                | Hosts CAJ + Session Pool            |
| Container Apps Job (manual trigger)       | Long-running task demo              |
| Code Interpreter Session Pool (PythonLTS) | Sandboxed Python via Jupyter kernel |
| Azure OpenAI (gpt-4o-mini)                | LLM + tool calling in backend       |
| Container Registry                        | CAJ worker image เท่านั้น              |

## เปลี่ยนจาก v3

|                 | v3                     | v4                                          |
| --------------- | ---------------------- | ------------------------------------------- |
| LLM             | GPT-5.4 (OpenCode CLI) | Azure OpenAI gpt-4o-mini (SDK)              |
| Code generation | OpenCode CLI binary    | Azure OpenAI tool calling                   |
| Auth to OpenAI  | API key                | `DefaultAzureCredential` (Managed Identity) |
| CAJ image       | Node + OpenCode        | Python หรือ Node minimal (ไม่ต้องมี OpenCode)   |
