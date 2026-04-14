import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { authPlugin } from "#server/lib/auth-plugin";
import { createContainer } from "#server/context/app-context";
import { createTodoRoutes } from "#server/modules/todo";

const isProduction = process.env.NODE_ENV === "production";

// --- Composition Root: wire all dependencies via container ---
const container = createContainer();
const log = container.appContext.logger;

const baseApp = new Elysia()
  .onError(({ error, code }) => {
    log.error("Unhandled error", {
      code,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  })

  // --- health check ---
  .get("/api/health", () => ({ status: "ok" }))

  // --- Better Auth handler + auth macro ---
  .use(authPlugin)

  // --- Todo routes (session-protected via { withAuth: true }) ---
  .use(createTodoRoutes(container));

// --- Static file serving + SPA fallback (production only) ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: Elysia<any, any, any, any, any, any, any>;
if (isProduction) {
  const indexHtml = readFileSync(join(process.cwd(), "app/dist/index.html"));
  app = baseApp
    .use(await staticPlugin({ assets: "app/dist", prefix: "/" }))
    .get("/*", () => new Response(indexHtml, { headers: { "Content-Type": "text/html" } }))
    .listen(3001);
} else {
  app = baseApp.listen(3001);
}

log.info("Server running", { port: app.server?.port });

export type App = typeof baseApp;
