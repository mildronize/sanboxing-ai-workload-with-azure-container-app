# Deployment Guide

## Prerequisites

- [Bun](https://bun.sh/) v1+
- [Docker](https://docs.docker.com/get-docker/)
- [Terraform](https://developer.hashicorp.com/terraform/install) v1.9+
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (`az`)
- A GitHub account with access to GitHub Container Registry (ghcr.io)
- An Azure subscription with permissions to create resources
- An OpenAI API key with access to GPT-5.4

## Local Development

```bash
# 1. Install dependencies
bun install

# 2. Copy environment file
cp .env.example .env
# Edit .env — the defaults work for local dev with mock workers

# 3. Generate Prisma client and push schema
bun run db:generate
bun run db:push

# 4. Start dev server
bun run dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Chat UI:  http://localhost:3000/chat
```

By default `USE_MOCK_WORKERS=true`, so the chat works without Azure credentials. Session mode returns echo responses; CAJ mode auto-completes after 5 seconds.

## Docker Build (Local)

### Backend app

```bash
docker build -t demo-app .
docker run -p 3001:3001 \
  -e DATABASE_URL="file:./dev.db" \
  -e BETTER_AUTH_SECRET="change-me" \
  -e BETTER_AUTH_URL="http://localhost:3001" \
  -e USE_MOCK_WORKERS="true" \
  demo-app
```

### Worker container

```bash
docker build -t demo-worker ./worker

# Test session mode
docker run -p 8080:8080 \
  -e MODE=session \
  -e OPENAI_API_KEY="sk-..." \
  demo-worker

# Test job mode
docker run \
  -e MODE=job \
  -e MESSAGE="Write a hello world in Python" \
  -e CALLBACK_URL="http://host.docker.internal:3001/api/worker/callback/test-1" \
  -e OPENAI_API_KEY="sk-..." \
  demo-worker
```

## Azure Deployment

### Step 1: Create an Azure Service Principal

```bash
az login
az ad sp create-for-rbac \
  --name "sandbox-ai-demo-sp" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID> \
  --sdk-auth
```

Save the output — you'll need `clientId`, `clientSecret`, `subscriptionId`, and `tenantId`.

### Step 2: Configure GitHub Repository Secrets

Go to your repo **Settings > Secrets and variables > Actions** and add:

| Secret | Value |
|--------|-------|
| `ARM_CLIENT_ID` | Service principal `clientId` |
| `ARM_CLIENT_SECRET` | Service principal `clientSecret` |
| `ARM_SUBSCRIPTION_ID` | Azure subscription ID |
| `ARM_TENANT_ID` | Azure tenant ID |
| `OPENAI_API_KEY` | OpenAI API key for GPT-5.4 |

### Step 3: Push Images via GitHub Actions

Push to `main` to trigger the **Build and Push Images** workflow, or trigger it manually from the Actions tab. This builds and pushes two images:

- `ghcr.io/<owner>/demo-app:latest` (backend + frontend)
- `ghcr.io/<owner>/demo-worker:latest` (worker container)

Make sure your GitHub packages are set to **public** so Azure can pull them without registry credentials, or configure registry auth in Terraform.

### Step 4: Deploy Infrastructure with Terraform

#### Option A: Via GitHub Actions (recommended)

The **Deploy to Azure** workflow runs automatically after a successful image build, or can be triggered manually.

#### Option B: Manual deployment

```bash
cd terraform

# Copy and fill in variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize and deploy
terraform init
terraform plan
terraform apply
```

### Step 5: Two-Pass Deploy for Callback URL

On the first deploy, the backend's FQDN is not yet known. After `terraform apply` completes:

```bash
# Get the backend URL from Terraform output
terraform output backend_url
# Example: https://sandbox-ai-demo-backend.niceocean-abcd1234.southeastasia.azurecontainerapps.io

# Update terraform.tfvars with the callback URL
# backend_callback_url = "https://sandbox-ai-demo-backend.niceocean-abcd1234.southeastasia.azurecontainerapps.io"

# Re-apply
terraform apply
```

This ensures the CAJ worker can POST results back to the correct backend URL.

### Step 6: Assign Session Executor Role

Terraform creates the role assignment automatically, but verify it:

```bash
az role assignment list \
  --assignee <BACKEND_MANAGED_IDENTITY_PRINCIPAL_ID> \
  --scope <SESSION_POOL_RESOURCE_ID> \
  --query "[].roleDefinitionName"
```

You should see `Azure ContainerApps Session Executor`.

## Terraform Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | `rg-sandbox-ai-demo` | Contains everything |
| Log Analytics | `sandbox-ai-demo-logs` | Container Apps logging |
| Container Apps Environment | `sandbox-ai-demo-env` | Shared environment |
| Container App | `sandbox-ai-demo-backend` | Backend API + frontend SPA |
| Container App Job | `sandbox-ai-demo-worker-job` | CAJ worker (manual trigger) |
| Session Pool | `sandbox-ai-demo-session-pool` | Pre-warmed Dynamic Sessions |
| Container Registry | `sandboxaidemo` | ACR (for optional use) |

## Terraform Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `location` | `southeastasia` | Azure region |
| `resource_group_name` | `rg-sandbox-ai-demo` | Resource group name |
| `project_name` | `sandbox-ai-demo` | Prefix for all resource names |
| `openai_api_key` | (required) | OpenAI API key, sensitive |
| `backend_image` | (required) | ghcr.io image for backend |
| `worker_image` | (required) | ghcr.io image for worker |
| `backend_callback_url` | `""` | Override callback URL (set after first deploy) |

## Terraform Outputs

| Output | Description |
|--------|-------------|
| `backend_url` | Public URL of the backend app |
| `session_pool_endpoint` | Session pool management endpoint |
| `acr_login_server` | ACR login server |
| `resource_group_name` | Resource group name |
| `container_app_environment_id` | Environment resource ID |

## Environment Variables Reference

### Backend App

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | SQLite connection string |
| `BETTER_AUTH_SECRET` | Yes | - | Auth session secret |
| `BETTER_AUTH_URL` | Yes | - | Auth base URL |
| `NODE_ENV` | No | `development` | Environment |
| `USE_MOCK_WORKERS` | No | `true` | Use mock workers for local dev |
| `AZURE_SUBSCRIPTION_ID` | When real workers | - | Azure subscription |
| `AZURE_RESOURCE_GROUP` | When real workers | - | Resource group name |
| `CAJ_NAME` | When real workers | - | Container App Job name |
| `SESSION_POOL_ENDPOINT` | When real workers | - | Session pool management URL |
| `BACKEND_CALLBACK_URL` | When real workers | - | Backend public URL for callbacks |
| `OPENAI_API_KEY` | When real workers | - | OpenAI API key |

### Worker Container

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MODE` | Yes | - | `job` or `session` |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `MESSAGE` | Job mode | - | User prompt |
| `CALLBACK_URL` | Job mode | - | Backend callback endpoint |
| `EXTRA_SLEEP_SECONDS` | No | - | Pad job execution time |
| `TARGET_PORT` | No | `8080` | HTTP server port (session mode) |

## Teardown

```bash
cd terraform
terraform destroy
```

This removes all Azure resources. Container images remain in ghcr.io until manually deleted.
