# Deployment Guide

This guide covers two ways to run the full demo with Azure workers. Choose the option that fits your situation.

**Option 1: Local Backend + ngrok** — your Elysia backend runs on your laptop, ngrok tunnels it so CAJ workers can POST callbacks back. Best for development and debugging.

**Option 2: Cloud-Only** — everything runs on Azure. The backend is a Container App, no local server needed, no ngrok.

```
Option 1: Local Backend + ngrok
┌──────────────────────┐       ┌──────────────────────────────────┐
│  Your Laptop         │       │  Azure                           │
│                      │       │                                  │
│  Elysia + React      │◄──────│  CAJ Worker (callback via ngrok) │
│  localhost:3001      │       │  (minimal Python, runs CODE)     │
│        │             │       │                                  │
│        ▼             │──────►│  PythonLTS Session Pool           │
│  ngrok tunnel        │       │  (Microsoft-managed, /executions) │
│  https://xxxx.ngrok  │       │                                  │
│  .io                 │       │  Azure OpenAI (gpt-4o-mini)      │
│                      │       │  Azure PostgreSQL                │
└──────────────────────┘       └──────────────────────────────────┘

Option 2: Cloud-Only
┌──────────────────────────────────────────────────────────────────┐
│  Azure                                                           │
│                                                                  │
│  Backend Container App ◄──── CAJ Worker (callback via FQDN)    │
│  https://<project>-backend.<env-domain>                          │
│        │                                                         │
│        ▼                                                         │
│  PythonLTS Session Pool  │  Azure PostgreSQL  │  Azure OpenAI   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Required for both options:

- [Bun](https://bun.sh/) v1+
- [Terraform](https://developer.hashicorp.com/terraform/install) v1.9+
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- A [Terraform Cloud](https://app.terraform.io/) account (free tier)
- A GitHub account with access to ghcr.io
- An Azure subscription
- An Azure OpenAI resource with a `gpt-4o-mini` deployment (or similar model with tool calling support)

Required for Option 1 only:

- [ngrok](https://ngrok.com/download) (free tier works)

---

## Step 1: Local Setup

```bash
# Clone the repo and install dependencies
bun install

# Copy the environment template
cp .env.example .env

# Start local PostgreSQL (requires Docker)
docker compose up -d

# Generate Prisma client and push schema to local DB
bun run db:generate
bun run db:push

# Verify it runs in mock mode (no Azure required)
bun run dev
# Open http://localhost:3000 — register an account, verify chat works with mock workers
```

Stop the dev server once verified. You will restart it later with real Azure config (Option 1 only).

---

## Step 2: Build and Push Images

Push to `main` (or trigger manually from the **Actions** tab) to run the **Build and Push Images** workflow. It builds and pushes:

- `ghcr.io/<owner>/demo-app:latest` (backend)
- `ghcr.io/<owner>/demo-worker:latest` (CAJ worker — Python only)

Both images are tagged with `latest` and the commit SHA.

After the workflow completes, set both package visibilities to **public** in GitHub (**Settings > Packages > Package settings > Danger Zone > Change visibility**) so Azure can pull the images without registry credentials.

---

## Step 3: Create an Azure Service Principal

Terraform Cloud runs remotely — it cannot use your local `az login`. Create a service principal:

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

---

## Step 4: Set Up Terraform Cloud

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

---

## Step 5: Configure Variables in Terraform Cloud

### Option A: Using the setup script

```bash
# Copy and fill in your values
cp terraform/tfc-vars.env.example terraform/tfc-vars.env
# Edit terraform/tfc-vars.env

# Get your TFC token
export TFC_TOKEN=$(cat ~/.terraform.d/credentials.tfrc.json | bun -e "console.log(JSON.parse(await Bun.stdin.text()).credentials['app.terraform.io'].token)")
export TFC_ORG=your-org-name

# Push all variables to Terraform Cloud
bun run terraform/scripts/setup-tfc-vars.ts
```

### Option B: Manual setup via Terraform Cloud UI

Go to your workspace **Settings > Variables** and add:

#### Environment Variables

| Key | Value | Sensitive |
|-----|-------|-----------|
| `ARM_CLIENT_ID` | Service principal `appId` | No |
| `ARM_CLIENT_SECRET` | Service principal `password` | Yes |
| `ARM_SUBSCRIPTION_ID` | Your subscription ID | No |
| `ARM_TENANT_ID` | Service principal `tenant` | No |

#### Terraform Variables

| Key | Value | Sensitive | Notes |
|-----|-------|-----------|-------|
| `location` | `southeastasia` | No | Azure region |
| `resource_group_name` | `rg-sandbox-ai-demo` | No | |
| `project_name` | `sandbox-ai-demo` | No | |
| `azure_openai_endpoint` | `https://your-resource.openai.azure.com` | No | |
| `azure_openai_api_key` | Your Azure OpenAI key | Yes | |
| `azure_openai_deployment_name` | `gpt-4o-mini` | No | |
| `worker_image` | `ghcr.io/<your-github-username>/demo-worker:latest` | No | CAJ worker image |
| `backend_image` | `ghcr.io/<your-github-username>/demo-app:latest` | No | Backend image |
| `db_admin_username` | `pgadmin` (or your choice) | No | PostgreSQL admin user |
| `db_admin_password` | A strong password | Yes | PostgreSQL admin password |
| `better_auth_secret` | A random 32+ char string | Yes | Better Auth signing key |
| `max_users` | `30` | No | Max allowed registrations |
| `backend_callback_url` | See per-option instructions below | No | |

**Option 1 (`backend_callback_url`):** Set to your ngrok URL (e.g. `https://a1b2c3d4.ngrok-free.app`). See Step 7 — Option 1 for how to get this URL.

**Option 2 (`backend_callback_url`):** Leave empty. Terraform derives it automatically from the Container App's FQDN.

---

## Step 6: Deploy Azure Infrastructure

```bash
cd terraform

terraform init
terraform plan
terraform apply
```

These commands run **remotely on Terraform Cloud** — your local CLI triggers the run and streams the output.

This creates:

| Resource | Purpose |
|----------|---------|
| Resource Group | Contains everything |
| Log Analytics | Container Apps logging |
| Container Apps Environment | Shared environment for all container workloads |
| Backend Container App | Hosts the Elysia + React app (Option 2 only uses this) |
| Container App Job | CAJ worker (manual trigger, receives CODE env var) |
| PythonLTS Session Pool | Microsoft-managed Python runtime, pre-warmed, Hyper-V isolated |
| PostgreSQL Flexible Server | Azure-managed PostgreSQL (B1MS, cheapest tier) |
| PostgreSQL Database | `sandbox` database on the server |
| Role Assignment | Backend managed identity can execute sessions |

Note the outputs after apply:

```bash
terraform output session_pool_endpoint
terraform output backend_url
terraform output database_host
```

---

## Step 7: Run the Backend

Choose your option:

---

### Option 1: Local Backend + ngrok

The backend runs on your laptop. ngrok exposes it publicly so CAJ workers can POST callbacks.

#### 7a. Start ngrok

In a separate terminal:

```bash
bun run scripts/tunnel.ts
```

This starts ngrok on port 3001 and automatically:
1. Updates `.env` with `BACKEND_CALLBACK_URL`
2. Updates `terraform/tfc-vars.env` with the new ngrok URL

The tunnel URL changes every restart (free tier), so keep this terminal open. If you restart ngrok, re-run the script — it handles updates automatically.

Alternatively, start ngrok manually:

```bash
ngrok http 3001
# Copy the Forwarding URL (e.g. https://a1b2c3d4.ngrok-free.app)
```

Then update `backend_callback_url` in Terraform Cloud and re-run `terraform apply` so the CAJ job picks up the new URL.

#### 7b. Configure `.env` for Azure

Edit your `.env` file with values from Azure and Terraform outputs:

```bash
# Database — use local PostgreSQL for development
DATABASE_URL="postgresql://sandbox:sandbox@localhost:5432/sandbox_dev"
# Or use Azure PostgreSQL:
# DATABASE_URL="postgresql://pgadmin:<password>@<database_host>:5432/sandbox?sslmode=require"

# Auth
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3001"

# Registration limit
MAX_USERS="30"

# Switch to real Azure workers
USE_MOCK_WORKERS="false"

# Azure (from your subscription + terraform outputs)
AZURE_SUBSCRIPTION_ID="<from az account show>"
AZURE_RESOURCE_GROUP="rg-sandbox-ai-demo"
CAJ_NAME="sandbox-ai-demo-worker-job"
SESSION_POOL_ENDPOINT="<from terraform output session_pool_endpoint>"
BACKEND_CALLBACK_URL="<your ngrok URL>"

# Azure OpenAI
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
AZURE_OPENAI_API_KEY="<your Azure OpenAI key>"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"
```

#### 7c. Start the local backend

```bash
# Make sure ngrok is still running in another terminal
bun run dev
# Open http://localhost:3000
```

---

### Option 2: Cloud-Only

The backend Container App is already deployed by Terraform in Step 6. No local server needed.

#### 7a. Run database migrations against Azure PostgreSQL

After the first `terraform apply`, the PostgreSQL server exists but the schema has not been pushed yet. Run Prisma push against the Azure database:

```bash
# Get the database host from Terraform outputs
terraform output database_host
# e.g. sandbox-ai-demo-pg.postgres.database.azure.com

# Add a temporary firewall rule to allow your IP (remove it after)
az postgres flexible-server firewall-rule create \
  --resource-group rg-sandbox-ai-demo \
  --name sandbox-ai-demo-pg \
  --rule-name AllowMyIP \
  --start-ip-address $(curl -s https://api.ipify.org) \
  --end-ip-address $(curl -s https://api.ipify.org)

# Push the schema
DATABASE_URL="postgresql://pgadmin:<password>@<database_host>:5432/sandbox?sslmode=require" \
  bun run db:push

# Remove the temporary firewall rule
az postgres flexible-server firewall-rule delete \
  --resource-group rg-sandbox-ai-demo \
  --name sandbox-ai-demo-pg \
  --rule-name AllowMyIP \
  --yes
```

#### 7b. Verify the backend

```bash
terraform output backend_url
# e.g. https://sandbox-ai-demo-backend.<env-domain>
```

Open the backend URL in your browser. The app should load and registration/login should work.

The backend Container App is configured by Terraform with all required environment variables:
- `DATABASE_URL` — automatically wired from the PostgreSQL server FQDN and credentials
- `BETTER_AUTH_SECRET` — from the `better_auth_secret` Terraform variable
- `BETTER_AUTH_URL` — derived from the Container App FQDN
- `BACKEND_CALLBACK_URL` — derived from the Container App FQDN (CAJ workers POST back here)
- `MAX_USERS` — from the `max_users` Terraform variable

No local server is needed.

---

## Step 8: Using the Demo

Open the app URL (localhost:3000 for Option 1, or the backend URL for Option 2).

Register an account, then go to the chat page.

### Using Dynamic Session Mode

1. Click the **"Dynamic Session"** toggle in the chat header (this is the default)
2. Type a message that requires computation, for example:
   - `"Calculate the first 20 Fibonacci numbers"`
   - `"Generate a multiplication table from 1 to 10"`
   - `"What is the sum of all prime numbers under 100?"`
3. The backend calls Azure OpenAI, the model generates Python code, code executes in a PythonLTS session, result returns
4. In the chat you will see three blocks:
   - **PYTHON** — the generated code
   - **OUTPUT** — stdout from execution
   - **Reply** — the model's formatted explanation
5. Response time: ~2-5s (pre-warmed session, no cold start)
6. Session state persists — variables from previous messages carry over. Try:
   - First message: `"Set x = 42"`
   - Second message: `"Print x * 2"` — it remembers `x` from the previous execution

### Using Container App Job Mode

1. Click the **"Container App Job"** toggle in the chat header
2. Type a message, for example: `"Generate a report of squares from 1 to 20"`
3. The backend calls Azure OpenAI, the model generates Python code, you see the code immediately in chat
4. A "Processing..." animation appears — the CAJ container is cold-starting (~10-30s)
5. Behind the scenes:
   - Azure spins up a new container with your Python code as the `CODE` env var
   - The container runs the code, captures stdout
   - The container POSTs `{ "stdout": "..." }` back to the callback URL (ngrok for Option 1, Container App FQDN for Option 2)
   - The container is destroyed after completion
6. When the result arrives, it replaces the "Processing..." message with the stdout output

### Key Differences to Observe

| What to watch | Dynamic Session | Container App Job |
|---------------|-----------------|-------------------|
| Response time | ~2-5 seconds | ~15-30 seconds (cold start) |
| Code block | Appears with result | Appears immediately |
| Output block | Appears with result | Appears when job completes |
| Status badge | `Dynamic Session` | `CAJ` with elapsed time |
| Session state | Persists across messages | Each job is isolated |

---

## Step 9: RBAC Setup

### Option 1: Local backend

When running locally, `DefaultAzureCredential` uses your `az login` identity. Your user account needs the `Azure ContainerApps Session Executor` role on the session pool to call the `/executions` API:

```bash
az role assignment create \
  --role "Azure ContainerApps Session Executor" \
  --assignee "$(az ad signed-in-user show --query id -o tsv)" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-sandbox-ai-demo/providers/Microsoft.App/sessionPools/sandboxaidemosessionpool"
```

### Option 2: Cloud-only

No manual RBAC setup is needed. Terraform assigns the `Azure ContainerApps Session Executor` role to the backend Container App's managed identity automatically during `terraform apply`.

---

## Troubleshooting

### CAJ callback not arriving (Option 1)

- Check ngrok terminal — you should see `POST /api/worker/callback/<jobId>` requests
- Verify `BACKEND_CALLBACK_URL` in `.env` matches the current ngrok URL
- The callback body is `{ "stdout": "..." }` — make sure the worker image is up to date
- Verify the CAJ job's env vars include the correct callback URL:
  ```bash
  az containerapp job execution list \
    --name sandbox-ai-demo-worker-job \
    --resource-group rg-sandbox-ai-demo \
    -o table
  ```

### CAJ callback not arriving (Option 2)

- Verify `BACKEND_CALLBACK_URL` in the Container App env vars matches the backend FQDN
- If you left `backend_callback_url` empty in Terraform, the URL is derived from the Container App FQDN. This requires the Container App to exist first — if you see a circular reference on the first apply, set the variable explicitly and re-apply.
- Check Container App logs: **Azure Portal > Container Apps > backend > Log stream**

### ngrok URL changed (Option 1)

If you restarted ngrok, re-run the tunnel script:

```bash
bun run scripts/tunnel.ts
```

Then restart the web app: `bun run dev`

If ngrok URL changed and you already have Azure infra deployed, update `backend_callback_url` in Terraform Cloud and re-run `terraform apply` to update the CAJ job's callback URL.

### Dynamic Session not responding

- The session pool is PythonLTS (Microsoft-managed) — no custom image to debug
- Verify the session pool exists and has warm instances:
  ```bash
  az containerapp sessionpool show \
    --name <session-pool-name> \
    --resource-group rg-sandbox-ai-demo \
    --query "properties.scaleConfiguration.readySessionInstances"
  ```
- Check that the backend has the `Azure ContainerApps Session Executor` role on the session pool
- Verify `SESSION_POOL_ENDPOINT` matches the terraform output

### Azure OpenAI not generating code

- The system prompt forces tool use — the model should always call `execute_python`
- Check that `AZURE_OPENAI_DEPLOYMENT_NAME` matches your deployed model name
- Verify the model supports tool calling (gpt-4o-mini, gpt-4o, etc.)
- Check backend logs for `Azure OpenAI error:` messages

### Registration not working

- Check `MAX_USERS` env var — if the user count has reached the limit, new registrations return 403
- The app shows "Registration closed" on the signup page when the limit is reached
- To check current user count: `GET /api/auth/registration-status`
- To increase the limit: update `max_users` in Terraform Cloud and re-apply (Option 2), or update `MAX_USERS` in `.env` (Option 1)

### Database connection issues

- For Option 1 with local PostgreSQL: ensure `docker compose up -d` is running and `DATABASE_URL` points to `localhost:5432`
- For Option 1 with Azure PostgreSQL: ensure the firewall allows your IP and `sslmode=require` is in the connection string
- For Option 2: `DATABASE_URL` is automatically wired by Terraform. Check Container App secrets in the Azure Portal if the backend fails to start.

---

## Teardown

```bash
cd terraform
terraform destroy
```

This removes all Azure resources, including the PostgreSQL server and its data. The worker and backend images stay in ghcr.io until you delete them manually.
