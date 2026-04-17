# Task 2: Azure OpenAI Client + Tool Definition

## Objective

Create the Azure OpenAI client wrapper and tool definition for `execute_python`. This is the core LLM integration that replaces the OpenCode CLI.

## Scope

- Install `openai` npm package
- Create Azure OpenAI client module
- Define `execute_python` tool schema
- Define system prompt constant
- Create a function that calls Azure OpenAI with tool calling and returns the generated Python code

## Files to Create/Modify

- `package.json` (add `openai` dependency)
- `server/lib/openai.ts` (new -- Azure OpenAI client, tool def, system prompt, `generatePythonCode()` function)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md` -- use path aliases, no console.log
- `.chief/milestone-2/_goal/goal.md` -- Decisions #1, #2, #3

## Steps

1. `bun add openai`
2. Create `server/lib/openai.ts` with:
   - `AzureOpenAI` client instantiation using env vars (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT_NAME`)
   - `execute_python` tool definition object
   - System prompt constant (aggressive prompt forcing tool use)
   - `generatePythonCode(messages: ChatCompletionMessageParam[], client: AzureOpenAI)` function that:
     - Calls chat completions with the tool and provided messages array
     - Parses tool call response
     - Returns `{ code: string, reply: string }` -- never throws; on failure returns `{ code: "", reply: "error explanation" }`
   - Helper `buildInitialMessages(userMessage: string)` that creates the initial messages array with system prompt + user message
   - The messages array design allows task-4 to append error context for the self-correction loop
3. Export a factory function `createOpenAIClient(config)` so it can be wired into the container

## Acceptance Criteria

- `openai` package installed
- `server/lib/openai.ts` exports client factory and `generatePythonCode`
- Tool definition matches the spec in goal.md Decision #2
- System prompt stored as const, not hardcoded in handler
- Types are clean (no `any`)

## Verification

```bash
bunx tsc --noEmit
```

## Deliverables

- `server/lib/openai.ts`
- Updated `package.json` / `bun.lockb`
