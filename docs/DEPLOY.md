# Deployment Guide

How to deploy from zero to a working demo: web app runs locally on your machine, worker containers (CAJ + Dynamic Sessions) run on Azure, ngrok tunnels your local backend so CAJ workers can POST callbacks.

```
┌──────────────────────┐       ┌──────────────────────────────────┐
│  Your Laptop         │       │  Azure                           │
│                      │       │                                  │
│  Elysia + React      │◄──────│  CAJ Worker (callback via ngrok) │
│  localhost:3001      │       │                                  │
│        │             │       │  Dynamic Session Pool            │
│        ▼             │──────►│  (HTTP request from backend)     │
│  ngrok tunnel        │       │                                  │
│  https://xxxx.ngrok  │       │  Container Apps Environment      │
│  .io                 │       │                                  │
└──────────────────────┘       └──────────────────────────────────┘
```

## Prerequisites

- [Bun](https://bun.sh/) v1+
- [Terraform](https://developer.hashicorp.com/terraform/install) v1.9+
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- [ngrok](https://ngrok.com/download) (free tier works)
- A [Terraform Cloud](https://app.terraform.io/) account (free tier)
- A GitHub account with access to ghcr.io
- An Azure subscription
- An Azure OpenAI resource with a deployed model

## Step 1: Set Up the Local Web App

```bash
# Clone and install
bun install

# Set up environment
cp .env.example .env

# Generate Prisma client and create local DB
bun run db:generate
bun run db:push

# Verify it runs (mock mode)
bun run dev
# Open http://localhost:3000/chat — should work with mock workers
```

Stop the dev server once verified. We'll restart it later with real Azure config.

## Step 2: Start ngrok

In a separate terminal:

```bash
bun run scripts/tunnel.ts
```

This starts ngrok on port 3001 and automatically:
1. Updates the Azure Container App's `BACKEND_CALLBACK_URL` env var
2. Updates `terraform/tfc-vars.env` with the new ngrok URL

The tunnel URL changes every restart (free tier), so keep this terminal open throughout. If you restart ngrok, just re-run the script — it handles the updates automatically.

Alternatively, start ngrok manually and copy the URL:

```bash
ngrok http 3001
# Copy the Forwarding URL (e.g. https://a1b2c3d4.ngrok-free.app)
```

## Step 3: Build and Push the Worker Image

Push to `main` (or trigger manually from the **Actions** tab) to run the **Build and Push Images** workflow. It builds and pushes:

- `ghcr.io/<owner>/demo-app:latest`
- `ghcr.io/<owner>/demo-worker:latest`

Both images are tagged with `latest` and the commit SHA.

After the workflow completes, set the package visibility to **public** in GitHub (**Settings > Packages > Package settings > Danger Zone > Change visibility**) so Azure can pull the worker image without registry credentials.

## Step 4: Create an Azure Service Principal

Terraform Cloud runs remotely — it can't use your local `az login`. Create a service principal:

```bash
az login

az ad sp create-for-rbac \
  --name "sandbox-ai-demo-sp" \
  --role Contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)
```

Save the output:

```json
{
  "appId": "...",        // ARM_CLIENT_ID
  "password": "...",     // ARM_CLIENT_SECRET
  "tenant": "..."        // ARM_TENANT_ID
}
```

Also note your subscription ID:

```bash
az account show --query id -o tsv
# This is ARM_SUBSCRIPTION_ID
```

## Step 5: Set Up Terraform Cloud

1. Go to [app.terraform.io](https://app.terraform.io/) and create an organization (or use existing)
2. Create a workspace named `sandbox-ai-demo`
3. Set execution mode to **Remote** (Settings > General)
4. Run `terraform login` on your machine to authenticate the CLI

Add the cloud backend to `terraform/main.tf` (if not already present):

```hcl
terraform {
  cloud {
    organization = "your-org-name"
    workspaces {
      name = "sandbox-ai-demo"
    }
  }
}
```

## Step 6: Configure Variables in Terraform Cloud

### Option A: Using the setup script

```bash
# Copy and fill in your values
cp terraform/tfc-vars.env.example terraform/tfc-vars.env
# Edit terraform/tfc-vars.env

# Get your TFC token and set env vars
export TFC_TOKEN=$(cat ~/.terraform.d/credentials.tfrc.json | bun -e "console.log(JSON.parse(await Bun.stdin.text()).credentials['app.terraform.io'].token)")
export TFC_ORG=your-org-name

# Push all variables to Terraform Cloud
bun run terraform/scripts/setup-tfc-vars.ts
```

The script creates or updates all variables in your TFC workspace. Sensitive values are marked automatically.

### Option B: Manual setup via Terraform Cloud UI

Go to your workspace **Settings > Variables** and add:

### Environment Variables

| Key | Value | Sensitive |
|-----|-------|-----------|
| `ARM_CLIENT_ID` | Service principal `appId` | No |
| `ARM_CLIENT_SECRET` | Service principal `password` | Yes |
| `ARM_SUBSCRIPTION_ID` | Your subscription ID | No |
| `ARM_TENANT_ID` | Service principal `tenant` | No |

### Terraform Variables

| Key | Value | Sensitive |
|-----|-------|-----------|
| `location` | `southeastasia` | No |
| `resource_group_name` | `rg-sandbox-ai-demo` | No |
| `project_name` | `sandbox-ai-demo` | No |
| `azure_openai_endpoint` | `https://your-resource.openai.azure.com` | No |
| `azure_openai_api_key` | Your Azure OpenAI key | Yes |
| `azure_openai_deployment_name` | Your deployment name | No |
| `worker_image` | `ghcr.io/<your-github-username>/demo-worker:latest` | No |
| `backend_image` | `ghcr.io/<your-github-username>/demo-app:latest` | No |
| `backend_callback_url` | `https://a1b2c3d4.ngrok-free.app` (your ngrok URL) | No |

Note: `backend_image` is required by Terraform but not used (web app runs locally). Set it to the worker image as a placeholder.

## Step 7: Deploy Azure Infrastructure

```bash
cd terraform

terraform init
terraform plan
terraform apply
```

These commands run **remotely on Terraform Cloud** — your local CLI triggers the run and streams the output.

This creates:

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | `rg-sandbox-ai-demo` | Contains everything |
| Log Analytics | `sandbox-ai-demo-logs` | Container Apps logging |
| Container Apps Environment | `sandbox-ai-demo-env` | Shared environment |
| Container App Job | `sandbox-ai-demo-worker-job` | CAJ worker (manual trigger) |
| Session Pool | `sandbox-ai-demo-session-pool` | Pre-warmed Dynamic Sessions |
| Role Assignment | Session Executor | Backend identity can execute sessions |

Note the outputs after apply:

```bash
terraform output session_pool_endpoint
# Use this for SESSION_POOL_ENDPOINT in your .env
```

## Step 8: Configure the Local Web App for Azure

Edit your `.env` file with real Azure values:

```bash
# Database
DATABASE_URL="file:./dev.db"

# Auth
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3001"

# Switch to real workers
USE_MOCK_WORKERS="false"

# Azure (from your subscription + terraform output)
AZURE_SUBSCRIPTION_ID="<from az account show>"
AZURE_RESOURCE_GROUP="rg-sandbox-ai-demo"
CAJ_NAME="sandbox-ai-demo-worker-job"
SESSION_POOL_ENDPOINT="<from terraform output session_pool_endpoint>"
BACKEND_CALLBACK_URL="<your ngrok URL>"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_API_KEY=""
AZURE_OPENAI_DEPLOYMENT_NAME="your-deployment-name"
```

## Step 9: Run the Demo

```bash
# Make sure ngrok is still running in another terminal

bun run dev
# Open http://localhost:3000/chat
```

Test both modes:

1. **Dynamic Session** — select "Dynamic Session" toggle, send a message. Should get a response in ~1-3s (sub-second container allocation + OpenCode processing).

2. **Container App Job** — select "Container App Job" toggle, send a message. You'll see "Processing..." with a loading animation. The CAJ worker cold-starts (~10-30s), runs OpenCode, then POSTs the result back to your ngrok URL. The result appears in the chat.

## Troubleshooting

### CAJ callback not arriving

- Check ngrok terminal — you should see `POST /api/worker/callback/<jobId>` requests
- Verify `BACKEND_CALLBACK_URL` in `.env` matches the ngrok URL
- Verify the CAJ job's env vars include the correct callback URL:
  ```bash
  az containerapp job execution list \
    --name sandbox-ai-demo-worker-job \
    --resource-group rg-sandbox-ai-demo \
    -o table
  ```

### Dynamic Session not responding

- Verify the session pool has warm instances:
  ```bash
  az containerapp sessionpool show \
    --name sandbox-ai-demo-session-pool \
    --resource-group rg-sandbox-ai-demo \
    --query "properties.scaleConfiguration.readySessionInstances"
  ```
- Check that the backend has the `Azure ContainerApps Session Executor` role on the session pool

### ngrok URL changed

If you restarted ngrok, just re-run the tunnel script — it updates everything automatically:

```bash
bun run scripts/tunnel.ts
```

Then restart the web app: `bun run dev`

## Teardown

```bash
cd terraform
terraform destroy
```

This removes all Azure resources. The worker image stays in ghcr.io until you delete it manually.
