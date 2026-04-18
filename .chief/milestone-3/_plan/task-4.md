# Task 4: Terraform PostgreSQL Flexible Server

## Objective

Add Azure Database for PostgreSQL Flexible Server to Terraform and wire `DATABASE_URL` to the backend Container App.

## Scope

**Included:**
- New Terraform resource: `azurerm_postgresql_flexible_server`
- New Terraform resource: `azurerm_postgresql_flexible_server_database`
- New Terraform resource: `azurerm_postgresql_flexible_server_firewall_rule` (allow Azure services)
- New Terraform variables: `db_admin_username`, `db_admin_password`
- Update `container-apps.tf`: add `DATABASE_URL` env var to backend container
- Update `terraform/variables.tf` with new variables
- Update `terraform/outputs.tf` with database hostname
- Update `terraform/tfc-vars.env.example` with new variables
- Add `BETTER_AUTH_SECRET` and `MAX_USERS` env vars to backend container

**Excluded:**
- Application code changes (tasks 1-3)
- DEPLOY.md changes (task 5)

## Rules & Contracts

- `.chief/_rules/_verification/definition-of-done.md` (terraform validate + fmt)
- `.chief/milestone-3/_contract/database-contract.md`

## Steps

1. Create `terraform/database.tf`:
   - `azurerm_postgresql_flexible_server` with SKU `B_Standard_B1ms`
   - `storage_mb = 32768` (32 GB)
   - `version = "16"`
   - Public access enabled
   - `azurerm_postgresql_flexible_server_database` for the app database
   - `azurerm_postgresql_flexible_server_firewall_rule` with start_ip `0.0.0.0` and end_ip `0.0.0.0` (Azure services only)
2. Add variables to `terraform/variables.tf`:
   - `db_admin_username` (string, default "pgadmin")
   - `db_admin_password` (string, sensitive)
   - `better_auth_secret` (string, sensitive)
   - `max_users` (number, default 30)
3. Update `container-apps.tf` backend container env:
   - Add `DATABASE_URL` as secret (constructed from PostgreSQL server outputs)
   - Add `BETTER_AUTH_SECRET` as secret
   - Add `BETTER_AUTH_URL` derived from backend FQDN
   - Add `MAX_USERS` env var
4. Add secrets block entries for new sensitive values
5. Update `terraform/outputs.tf`:
   - Add `database_host` output
6. Update `terraform/tfc-vars.env.example` with new variables
7. Run `terraform fmt` and `terraform validate`

## Acceptance Criteria

- `terraform validate` passes
- `terraform fmt -check` passes
- PostgreSQL Flexible Server resource defined with B1MS SKU
- Firewall rule allows Azure services only (0.0.0.0/0.0.0.0)
- `DATABASE_URL` wired to backend Container App as secret
- `BETTER_AUTH_SECRET` wired as secret
- `BETTER_AUTH_URL` wired as env var (derived from backend FQDN)
- `MAX_USERS` wired as env var
- New variables have sensible defaults where appropriate

## Verification

```bash
cd terraform && terraform validate
cd terraform && terraform fmt -check
```

## Deliverables

- Created: `terraform/database.tf`
- Modified: `terraform/variables.tf`, `terraform/container-apps.tf`, `terraform/outputs.tf`, `terraform/tfc-vars.env.example`
