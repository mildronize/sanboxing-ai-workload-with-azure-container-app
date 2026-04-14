// server.ts — minimal HTTP wrapper around OpenCode CLI for Dynamic Session mode
// Accepts POST /chat with { message: string } and returns OpenCode response.
import { $ } from "bun";

const port = Number(process.env.TARGET_PORT) || 8080;

console.log(`[worker] Dynamic Session server starting on port ${port}`);

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check — any non-POST request returns OK
    if (req.method !== "POST" || url.pathname !== "/chat") {
      return new Response("OK", { status: 200 });
    }

    let message: string;
    try {
      const body = await req.json();
      message = body.message;
      if (typeof message !== "string" || message.trim() === "") {
        return Response.json(
          { error: "message must be a non-empty string" },
          { status: 400 }
        );
      }
    } catch {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const startTime = Date.now();

    // Run OpenCode in non-interactive mode
    const result = await $`opencode -p ${message} -q`.text();

    const elapsed = Date.now() - startTime;

    return Response.json({
      response: result.trim(),
      elapsed_ms: elapsed,
      worker: "dynamic-session",
    });
  },
});
