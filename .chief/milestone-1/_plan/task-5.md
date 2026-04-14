# Task 5: Azure Integration in Chat Service

## Objective

Replace the in-memory worker stubs from task-2 with real Azure API calls for CAJ trigger and Dynamic Session HTTP requests.

## Scope

- Add Azure SDK dependency (`@azure/identity`)
- Create Azure client utilities in `server/lib/azure.ts`
- Update ChatService to call Azure REST API for CAJ and Dynamic Session

## Rules & Contracts

- `.chief/milestone-1/_contract/api-contract.md` -- service method signatures
- `.chief/milestone-1/_contract/infra-contract.md` -- Azure resource references

## Steps

1. Install `@azure/identity` for `DefaultAzureCredential`
2. Create `server/lib/azure.ts` -- Azure credential helper, CAJ trigger function, session pool request function
3. Update `ChatService` to use real Azure calls instead of stubs
4. Add env vars: `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `CAJ_NAME`, `SESSION_POOL_ENDPOINT`, `BACKEND_CALLBACK_URL`
5. Keep stub mode available via `USE_MOCK_WORKERS=true` env var for local dev

## Acceptance Criteria

- With real Azure credentials: CAJ job triggers, session responds
- With `USE_MOCK_WORKERS=true`: stubs still work for local dev
- Type check passes

## Verification

```bash
bunx tsc --noEmit
```

## Deliverables

- New: `server/lib/azure.ts`
- Modified: `server/modules/chat/chat.service.ts`
- Modified: `server/context/app-context.ts` (add Azure config)
- Modified: `package.json` (new dependency)
