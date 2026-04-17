/**
 * Start ngrok tunnel and update:
 * 1. .env file (BACKEND_CALLBACK_URL)
 * 2. terraform/tfc-vars.env (backend_callback_url)
 *
 * Usage:
 *   bun run scripts/tunnel.ts
 *
 * Requires:
 *   - ngrok installed
 */

import { $ } from "bun";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

// --- Config ---

const config = {
  forwardPort: 3001,
  ngrokPort: 4040,
  logPath: "./.logs/ngrok.log",
  healthCheckUrl: "http://localhost:3001/api/health",
  healthCheckInterval: 1000,
  envPath: ".env",
  tfcVarsPath: "terraform/tfc-vars.env",
};

// --- Ngrok tunnel URL schema ---

const tunnelSchema = z.object({
  tunnels: z.array(z.object({ public_url: z.string() })),
});

// --- Helpers ---

async function killNgrok() {
  try {
    const pid = (await $`ps aux | grep ngrok | grep -v grep | awk '{print $2}'`.quiet()).stdout.toString().trim();
    if (pid) {
      await $`kill -9 ${pid}`.quiet();
      console.log(`Killed existing ngrok process (pid ${pid})`);
    }
  } catch {
    // No process found
  }
}

async function waitUntilReady(url: string, label: string) {
  while (true) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status === 200) {
        console.log(`${label} is ready`);
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, config.healthCheckInterval));
  }
}

async function getTunnelUrl(): Promise<string> {
  const tunnelApiUrl = `http://localhost:${config.ngrokPort}/api/tunnels`;
  await waitUntilReady(tunnelApiUrl, "ngrok API");

  // Poll until a tunnel is registered (API may be ready before tunnels are)
  while (true) {
    const res = await fetch(tunnelApiUrl);
    const data = tunnelSchema.parse(await res.json());
    if (data.tunnels.length > 0) {
      return data.tunnels[0].public_url;
    }
    await new Promise((r) => setTimeout(r, config.healthCheckInterval));
  }
}

function updateEnvFile(tunnelUrl: string) {
  const filePath = config.envPath;
  if (!existsSync(filePath)) {
    console.warn(`${filePath} not found, skipping`);
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith("BACKEND_CALLBACK_URL=")) {
      found = true;
      return `BACKEND_CALLBACK_URL="${tunnelUrl}"`;
    }
    return line;
  });

  if (!found) {
    updated.push(`BACKEND_CALLBACK_URL="${tunnelUrl}"`);
  }

  writeFileSync(filePath, updated.join("\n"));
  console.log(`Updated ${filePath}: BACKEND_CALLBACK_URL=${tunnelUrl}`);
}

function updateTfcVarsEnv(tunnelUrl: string) {
  const filePath = config.tfcVarsPath;
  if (!existsSync(filePath)) {
    console.warn(`${filePath} not found, skipping`);
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith("backend_callback_url=")) {
      found = true;
      return `backend_callback_url=${tunnelUrl}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`backend_callback_url=${tunnelUrl}`);
  }

  writeFileSync(filePath, updated.join("\n"));
  console.log(`Updated ${filePath}: backend_callback_url=${tunnelUrl}`);
}

// --- Main ---

async function main() {
  await killNgrok();

  // Ensure log directory exists
  if (!existsSync(dirname(config.logPath))) {
    mkdirSync(dirname(config.logPath), { recursive: true });
  }

  // Start ngrok in background
  console.log(`Starting ngrok on port ${config.forwardPort}...`);
  const ngrokProc = Bun.spawn(["ngrok", "http", String(config.forwardPort), "--log=stdout"], {
    stdout: Bun.file(config.logPath),
    stderr: "inherit",
  });

  // Setup cleanup on exit
  const cleanup = () => {
    console.log("\nShutting down ngrok...");
    ngrokProc.kill();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Wait for tunnel and get URL
  const tunnelUrl = await getTunnelUrl();
  console.log(`\nNgrok tunnel URL: ${tunnelUrl}\n`);

  // Update .env and tfc-vars.env
  updateEnvFile(tunnelUrl);
  updateTfcVarsEnv(tunnelUrl);

  // Check if backend is running
  console.log("\nWaiting for backend...");
  waitUntilReady(config.healthCheckUrl, "Backend").then(() => {
    console.log(`\nReady! Backend is accessible at: ${tunnelUrl}/api/health`);
  });

  // Keep process alive
  await ngrokProc.exited;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
