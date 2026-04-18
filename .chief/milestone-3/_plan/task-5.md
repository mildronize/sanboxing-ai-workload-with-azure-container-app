# Task 5: DEPLOY.md Restructure + Final Verification

## Objective

Restructure `docs/DEPLOY.md` with two deployment options and run full end-to-end verification.

## Scope

**Included:**
- `docs/DEPLOY.md` — complete rewrite with two options
- `.env.example` — verify all new env vars are documented
- Full verification pass (tsc, test, build, terraform validate)

**Excluded:**
- Application code changes (tasks 1-3)
- Terraform resource changes (task 4)

## Rules & Contracts

- `.chief/_rules/_verification/definition-of-done.md`

## Steps

1. Rewrite `docs/DEPLOY.md` with this structure:
   - **Prerequisites** (shared: Bun, Terraform, Azure CLI, etc.)
   - **Option 1: Local Backend + ngrok**
     - Step 1: Clone + install
     - Step 2: Start PostgreSQL via docker-compose
     - Step 3: Set up `.env` (PostgreSQL URL, auth secret)
     - Step 4: Generate Prisma client + push schema
     - Step 5: Start ngrok
     - Step 6: Build + push worker image
     - Step 7: Create Azure service principal
     - Step 8: Set up Terraform Cloud
     - Step 9: Deploy Azure infra (PostgreSQL also created — same Terraform for both options)
     - Step 10: Configure local `.env` for Azure workers
     - Step 11: Run the demo
   - **Option 2: Cloud-Only**
     - Step 1: Clone + install
     - Step 2: Build + push both images
     - Step 3: Create Azure service principal
     - Step 4: Set up Terraform Cloud
     - Step 5: Configure all TFC variables (including DB credentials)
     - Step 6: Deploy Azure infra (with PostgreSQL)
     - Step 7: Run Prisma migrate/push against Azure DB
     - Step 8: Verify via the backend URL
   - **Troubleshooting** (shared)
   - **Teardown** (shared)
2. Verify all env vars in `.env.example` match what the app actually reads
3. Run full verification:
   - `bunx tsc --noEmit`
   - `bun run test`
   - `bun run build`
   - `cd terraform && terraform validate`
   - `cd terraform && terraform fmt -check`

## Acceptance Criteria

- `DEPLOY.md` has two clearly separated deployment options
- All env vars documented in `.env.example`
- All verification commands pass

## Verification

```bash
bunx tsc --noEmit
bun run test
bun run build
cd terraform && terraform validate
cd terraform && terraform fmt -check
```

## Deliverables

- Modified: `docs/DEPLOY.md`, `.env.example` (if needed)
