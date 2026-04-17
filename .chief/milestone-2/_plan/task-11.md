# Task 11: End-to-End Type Check + Build Verification

## Objective

Run full verification suite after all previous tasks are complete. Fix any remaining type errors, lint issues, or build failures.

## Scope

- Type check entire project
- Build frontend
- Run tests
- Fix any breakage

## Files to Modify

- Any files with type errors or build failures

## Dependencies

- Tasks 1-9 (all complete)

## Rules & Contracts

- `.chief/_rules/_verification/definition-of-done.md`

## Steps

1. Run `bunx tsc --noEmit` -- fix any type errors
2. Run `bun run build` -- fix any build errors
3. Run `bun run test` -- existing tests still pass (no new tests in M2 scope)
4. Run `docker build -t demo-worker ./worker` -- verify worker builds
5. Run `cd terraform && terraform init -backend=false && terraform validate && terraform fmt -check` -- verify terraform

## Acceptance Criteria

- All verification commands pass
- No type errors
- Frontend builds
- Tests pass
- Worker Dockerfile builds
- Terraform validates

## Verification

```bash
bunx tsc --noEmit
bun run build
bun run test
docker build -t demo-worker ./worker
cd terraform && terraform validate && terraform fmt -check
```

## Deliverables

- Clean build with all checks passing
