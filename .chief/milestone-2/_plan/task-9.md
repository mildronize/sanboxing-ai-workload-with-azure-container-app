# Task 9: Terraform -- PythonLTS Session Pool + CAJ Env Var Cleanup

## Objective

Update Terraform to switch the session pool from `CustomContainer` to `PythonLTS` (no custom image) and update the CAJ job to remove OpenAI env vars (code generation now happens in the backend).

## Scope

- Rewrite `terraform/session-pool.tf` for PythonLTS
- Update `terraform/container-apps.tf` CAJ job env vars
- Remove worker image variable from session pool (PythonLTS is built-in)
- Clean up any variables no longer needed

## Files to Modify

- `terraform/session-pool.tf` (rewrite for PythonLTS)
- `terraform/container-apps.tf` (CAJ env var cleanup)
- `terraform/variables.tf` (remove `worker_image` from session pool usage, keep for CAJ)

## Rules & Contracts

- `.chief/_rules/_verification/definition-of-done.md` -- terraform validate + fmt
- `.chief/milestone-2/_goal/goal.md` -- Decision #5 (PythonLTS)

## Steps

1. Rewrite `terraform/session-pool.tf`:
   - Change `containerType` from `CustomContainer` to `PythonLTS`
   - Remove `customContainerTemplate` block entirely (PythonLTS is managed by Microsoft)
   - Keep `poolManagementType`, `environmentId`, `scaleConfiguration`, `sessionNetworkConfiguration`
2. Update `terraform/container-apps.tf` CAJ job:
   - Remove `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME` env vars from job template
   - Remove the `azure-openai-api-key` secret from CAJ job
   - `CODE` and `CALLBACK_URL` are injected at trigger time, not in template
3. Clean up `terraform/variables.tf` if `worker_image` is no longer needed for session pool
   - Keep `worker_image` for CAJ job only

## Acceptance Criteria

- Session pool uses `PythonLTS` container type
- No custom image reference in session pool
- CAJ job template has no OpenAI env vars
- `terraform validate` passes
- `terraform fmt -check` passes

## Verification

```bash
cd terraform && terraform init -backend=false && terraform validate
cd terraform && terraform fmt -check
```

## Deliverables

- Updated `terraform/session-pool.tf`
- Updated `terraform/container-apps.tf`
- Updated `terraform/variables.tf` (if needed)
