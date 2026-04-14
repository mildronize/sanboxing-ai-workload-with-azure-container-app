# Infrastructure Contract

## Terraform

Location: `infra/` at repo root.

### Resources

| Resource | Purpose |
|----------|---------|
| `azurerm_resource_group` | Contains all resources |
| `azurerm_container_app_environment` | Shared environment for CAJ + backend + session pool |
| `azurerm_container_registry` | Store worker image (ACR) |
| `azurerm_container_app_job` | CAJ worker -- manual trigger, `MODE=job` |
| `azurerm_container_app` | Backend app -- serves API + frontend |
| Session pool | Custom container session pool (may need azapi provider if not in azurerm) |
| Role assignments | Session Executor role for backend identity |

### Key Configuration

- CAJ: manual trigger type, single execution, `MODE=job` env var
- Session pool: `ready-session-instances=2`, `cooldown-period=300`, `target-port=8080`
- Backend: container app with managed identity
- ACR: admin enabled or managed identity pull

### Variables

```hcl
variable "location" {}
variable "resource_group_name" {}
variable "openai_api_key" { sensitive = true }
variable "backend_image" {}     # ghcr.io image for backend
variable "worker_image" {}      # ghcr.io image for worker
```

## GitHub Actions

Location: `.github/workflows/`

### Workflows

1. **build-and-push.yml** -- Build + push Docker images to ghcr.io
   - Triggers: push to main, manual
   - Builds: backend image (root Dockerfile), worker image (worker/Dockerfile)
   - Pushes to: `ghcr.io/<owner>/demo-app:latest`, `ghcr.io/<owner>/demo-worker:latest`

2. **deploy.yml** -- Deploy to Azure via Terraform
   - Triggers: after build-and-push, manual
   - Runs: `terraform apply` in `infra/`
   - Requires: Azure credentials as secrets
