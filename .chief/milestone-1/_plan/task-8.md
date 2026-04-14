# Task 8: GitHub Actions Workflows

## Objective

Create CI/CD workflows for building/pushing Docker images and deploying to Azure.

## Scope

- Create `.github/workflows/build-and-push.yml`
- Create `.github/workflows/deploy.yml`

## Rules & Contracts

- `.chief/milestone-1/_contract/infra-contract.md` -- workflow specs

## Steps

1. Create build-and-push workflow: build both images, push to ghcr.io
2. Create deploy workflow: run terraform apply
3. Configure required secrets documentation

## Acceptance Criteria

- Workflow YAML is valid
- Build workflow builds both images (app + worker)
- Deploy workflow runs terraform apply

## Verification

Manual review of YAML syntax.

## Deliverables

- New: `.github/workflows/build-and-push.yml`
- New: `.github/workflows/deploy.yml`
