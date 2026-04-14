# Task 10: Environment Configuration and Documentation

## Objective

Create environment variable documentation and configuration templates for local development, Docker, and Azure deployment.

## Scope

- Create `.env.example` with all required env vars
- Document deployment steps in a concise guide
- Ensure all env var references are consistent across app, worker, and infra

## Steps

1. Create `.env.example` with all env vars (app + Azure integration)
2. Create `worker/.env.example` for worker-specific vars
3. Verify env var names match between Terraform outputs, GitHub Actions secrets, and app code

## Acceptance Criteria

- `.env.example` covers all required configuration
- Env var names are consistent across all components

## Verification

Manual review.

## Deliverables

- New: `.env.example`
- New: `worker/.env.example`
