/**
 * Set up Terraform Cloud workspace variables from a local .env file.
 *
 * Usage:
 *   bun run terraform/scripts/setup-tfc-vars.ts
 *
 * Requires:
 *   - TFC_TOKEN: Terraform Cloud API token (from `terraform login` or TFC UI)
 *   - TFC_ORG: Terraform Cloud organization name
 *   - TFC_WORKSPACE: Terraform Cloud workspace name (default: sandbox-ai-demo)
 *
 * Reads from terraform/terraform.tfvars.env (key=value format, one per line).
 */

const TFC_TOKEN = process.env.TFC_TOKEN;
const TFC_ORG = process.env.TFC_ORG;
const TFC_WORKSPACE = process.env.TFC_WORKSPACE ?? "sandbox-ai-demo";
const TFC_API = "https://app.terraform.io/api/v2";

if (!TFC_TOKEN || !TFC_ORG) {
  console.error("Missing required env vars: TFC_TOKEN, TFC_ORG");
  console.error("");
  console.error("  export TFC_TOKEN=$(cat ~/.terraform.d/credentials.tfrc.json | bun -e 'console.log(JSON.parse(await Bun.stdin.text()).credentials[\"app.terraform.io\"].token)')");
  console.error("  export TFC_ORG=your-org-name");
  console.error("");
  process.exit(1);
}

// --- Variable definitions ---

interface VarDef {
  key: string;
  category: "terraform" | "env";
  sensitive: boolean;
  description: string;
}

const VAR_DEFS: VarDef[] = [
  // Terraform variables
  { key: "location", category: "terraform", sensitive: false, description: "Azure region" },
  { key: "resource_group_name", category: "terraform", sensitive: false, description: "Resource group name" },
  { key: "project_name", category: "terraform", sensitive: false, description: "Prefix for resource names" },
  { key: "azure_openai_endpoint", category: "terraform", sensitive: false, description: "Azure OpenAI endpoint" },
  { key: "azure_openai_api_key", category: "terraform", sensitive: true, description: "Azure OpenAI API key" },
  { key: "azure_openai_deployment_name", category: "terraform", sensitive: false, description: "Azure OpenAI deployment name" },
  { key: "worker_image", category: "terraform", sensitive: false, description: "ghcr.io worker image" },
  { key: "backend_image", category: "terraform", sensitive: false, description: "ghcr.io backend image (placeholder)" },
  { key: "backend_callback_url", category: "terraform", sensitive: false, description: "ngrok callback URL (Option 1) or empty (Option 2)" },
  { key: "db_admin_username", category: "terraform", sensitive: false, description: "PostgreSQL admin username" },
  { key: "db_admin_password", category: "terraform", sensitive: true, description: "PostgreSQL admin password" },
  { key: "better_auth_secret", category: "terraform", sensitive: true, description: "Better Auth signing key (32+ chars)" },
  { key: "max_users", category: "terraform", sensitive: false, description: "Max allowed user registrations" },

  // Environment variables (Azure auth for TFC remote execution)
  { key: "ARM_CLIENT_ID", category: "env", sensitive: false, description: "Service principal appId" },
  { key: "ARM_CLIENT_SECRET", category: "env", sensitive: true, description: "Service principal password" },
  { key: "ARM_SUBSCRIPTION_ID", category: "env", sensitive: false, description: "Azure subscription ID" },
  { key: "ARM_TENANT_ID", category: "env", sensitive: false, description: "Azure tenant ID" },
];

// --- Helpers ---

async function tfcFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${TFC_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TFC_TOKEN}`,
      "Content-Type": "application/vnd.api+json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TFC API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getWorkspaceId(): Promise<string> {
  const data = await tfcFetch(`/organizations/${TFC_ORG}/workspaces/${TFC_WORKSPACE}`);
  return data.data.id;
}

async function listExistingVars(workspaceId: string): Promise<Map<string, string>> {
  const data = await tfcFetch(`/workspaces/${workspaceId}/vars`);
  const map = new Map<string, string>();
  for (const v of data.data) {
    map.set(`${v.attributes.category}:${v.attributes.key}`, v.id);
  }
  return map;
}

async function upsertVar(
  workspaceId: string,
  existingVars: Map<string, string>,
  def: VarDef,
  value: string,
) {
  const existingId = existingVars.get(`${def.category}:${def.key}`);

  const payload = {
    data: {
      type: "vars",
      attributes: {
        key: def.key,
        value,
        category: def.category,
        sensitive: def.sensitive,
        description: def.description,
        hcl: false,
      },
    },
  };

  if (existingId) {
    await tfcFetch(`/workspaces/${workspaceId}/vars/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`  updated: ${def.key} (${def.category})`);
  } else {
    await tfcFetch(`/workspaces/${workspaceId}/vars`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`  created: ${def.key} (${def.category})`);
  }
}

// --- Parse env file ---

function parseEnvFile(path: string): Map<string, string> {
  const content = require("fs").readFileSync(path, "utf-8") as string;
  const vars = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars.set(key, value);
  }
  return vars;
}

// --- Main ---

const envFilePath = new URL("../tfc-vars.env", import.meta.url).pathname;

try {
  require("fs").accessSync(envFilePath);
} catch {
  console.error(`Missing ${envFilePath}`);
  console.error("");
  console.error("Create it from the example:");
  console.error("  cp terraform/tfc-vars.env.example terraform/tfc-vars.env");
  console.error("  # Edit with your values");
  process.exit(1);
}

const values = parseEnvFile(envFilePath);

console.log(`Workspace: ${TFC_ORG}/${TFC_WORKSPACE}`);
console.log("");

const workspaceId = await getWorkspaceId();
const existingVars = await listExistingVars(workspaceId);

console.log("Setting variables...");

for (const def of VAR_DEFS) {
  const value = values.get(def.key);
  if (value === undefined || value === "") {
    console.log(`  skipped: ${def.key} (not set in tfc-vars.env)`);
    continue;
  }
  await upsertVar(workspaceId, existingVars, def, value);
}

console.log("");
console.log("Done.");
