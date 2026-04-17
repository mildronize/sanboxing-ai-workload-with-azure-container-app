# Task 5: Chat Service Rewrite (CAJ Path) + CAJ Trigger Update

## Objective

Update the CAJ path to: (1) call Azure OpenAI in the backend to generate Python code, (2) pass the generated code as `CODE` env var to the CAJ container, and (3) remove OpenAI-related env vars from the CAJ trigger.

## Scope

- Rewrite `ChatService.triggerCajJob()` to call OpenAI first, then dispatch code
- Update `triggerCajJob()` in `server/lib/azure.ts` to pass `CODE` instead of `MESSAGE` + OpenAI vars
- Single OpenAI call, no agent loop for CAJ (fire and forget)
- Store `code` in ChatMessage

## Files to Modify

- `server/modules/chat/chat.service.ts` (CAJ path rewrite)
- `server/lib/azure.ts` (update `TriggerCajJobParams` and env vars)

## Dependencies

- Task 1 (schema has `code` field)
- Task 2 (OpenAI client exists)

## Rules & Contracts

- `.chief/milestone-2/_goal/goal.md` -- Decision #7 (CAJ simplified), Decision #8 (CAJ trigger)
- `.chief/_rules/_contract/api-conventions.md`

## Steps

1. Update `TriggerCajJobParams` in `azure.ts`:
   - Remove `azureOpenaiEndpoint`, `azureOpenaiApiKey`, `azureOpenaiDeploymentName`
   - Remove `message`
   - Add `code: string`
2. Update `triggerCajJob()` in `azure.ts`:
   - Pass `CODE` env var instead of `MESSAGE` + OpenAI vars
   - Keep `CALLBACK_URL`
3. Update `ChatService.triggerCajJob()`:
   - Call `generatePythonCode(message)` first
   - Pass the generated code to `triggerCajJob()`
   - Store `code` in the assistant placeholder ChatMessage
4. Update mock mode to return fake code
5. Update response to include `code` field per Decision #9

## Acceptance Criteria

- CAJ trigger passes `CODE` env var, not `MESSAGE`
- OpenAI env vars removed from CAJ trigger
- Backend calls Azure OpenAI before dispatching to CAJ
- Mock mode works
- Response includes `code` field

## Verification

```bash
bunx tsc --noEmit
```

## Deliverables

- Updated `server/lib/azure.ts`
- Updated `server/modules/chat/chat.service.ts`
