# Task 6: Terraform Configuration

## Objective

Create Terraform configuration for all Azure resources needed by the demo.

## Scope

- Create `infra/` directory with Terraform files
- Define all Azure resources per infra contract

## Rules & Contracts

- `.chief/milestone-1/_contract/infra-contract.md` -- resource list and configuration

## Steps

1. Create `infra/main.tf` -- provider config, resource group
2. Create `infra/container-apps.tf` -- environment, backend container app, CAJ
3. Create `infra/session-pool.tf` -- custom container session pool (azapi if needed)
4. Create `infra/registry.tf` -- ACR
5. Create `infra/variables.tf` -- input variables
6. Create `infra/outputs.tf` -- backend URL, session pool endpoint
7. Create `infra/terraform.tfvars.example` -- example values

## Acceptance Criteria

- `terraform validate` passes
- `terraform fmt -check` passes
- All resources from infra contract are defined

## Verification

```bash
cd infra && terraform init && terraform validate && terraform fmt -check
```

## Deliverables

- New: `infra/*.tf`
- New: `infra/terraform.tfvars.example`
