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
│  .io                 │       │  + ACR                           │
└──────────────────────┘       └──────────────────────────────────┘
```

## Prerequisites

- [Bun](https://bun.sh/) v1+
- [Docker](https://docs.docker.com/get-docker/)
- [Terraform](https://developer.hashicorp.com/terraform/install) v1.9+
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- [ngrok](https://ngrok.com/download) (free tier works)
- A [Terraform Cloud](https://app.terraform.io/) account (free tier, for remote state)
- A GitHub account with access to ghcr.io
- An Azure subscription
- An OpenAI API key with GPT-5.4 access

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
ngrok http 3001
```

Copy the `Forwarding` URL (e.g. `https://a1b2c3d4.ngrok-free.app`). This changes every time you restart ngrok (free tier), so keep this terminal open throughout.

## Step 3: Build and Push the Worker Image

```bash
# Log in to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u <your-github-username> --password-stdin

# Build the worker image
docker build -t ghcr.io/<your-github-username>/demo-worker:latest ./worker

# Push it
docker push ghcr.io/<your-github-username>/demo-worker:latest
```

Make sure the package visibility is set to **public** in GitHub (Settings > Packages) so Azure can pull it without registry credentials.

## Step 4: Set Up Terraform Cloud

1. Go to [app.terraform.io](https://app.terraform.io/) and create an organization (or use existing)
2. Create a workspace named `sandbox-ai-demo` with **execution mode: Local**
3. Run `terraform login` on your machine to authenticate

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

## Step 5: Azure Login and Service Principal

```bash
az login

# Note your subscription ID
az account show --query id -o tsv
```

Terraform authenticates via Azure CLI by default. No service principal needed for local execution.

## Step 6: Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
location            = "southeastasia"
resource_group_name = "rg-sandbox-ai-demo"
project_name        = "sandbox-ai-demo"

openai_api_key = "sk-proj-..."

# Use your ghcr.io worker image
worker_image = "ghcr.io/<your-github-username>/demo-worker:latest"

# The backend image is not used (web app runs locally),
# but Terraform still requires it. Use a placeholder or the worker image.
backend_image = "ghcr.io/<your-github-username>/demo-worker:latest"

# Set this to your ngrok URL
backend_callback_url = "https://a1b2c3d4.ngrok-free.app"
```

## Step 7: Deploy Azure Infrastructure

```bash
cd terraform

terraform init
terraform plan
terraform apply
```

This creates:

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | `rg-sandbox-ai-demo` | Contains everything |
| Log Analytics | `sandbox-ai-demo-logs` | Container Apps logging |
| Container Apps Environment | `sandbox-ai-demo-env` | Shared environment |
| Container App Job | `sandbox-ai-demo-worker-job` | CAJ worker (manual trigger) |
| Session Pool | `sandbox-ai-demo-session-pool` | Pre-warmed Dynamic Sessions |
| Container Registry | `sandboxaidemo` | ACR |

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
OPENAI_API_KEY="sk-proj-..."
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

If you restarted ngrok, the URL changed. Update `.env` with the new URL, then update Terraform so the CAJ job gets the new callback URL:

```bash
# Update terraform.tfvars with new ngrok URL
# backend_callback_url = "https://new-url.ngrok-free.app"

cd terraform
terraform apply
```

Then restart the web app: `bun run dev`

## Teardown

```bash
cd terraform
terraform destroy
```

This removes all Azure resources. The worker image stays in ghcr.io until you delete it manually.
