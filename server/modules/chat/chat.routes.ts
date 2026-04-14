import { Elysia, t } from "elysia";
import type { ServiceContainer } from "#server/context/app-context.ts";

export function createChatRoutes(container: ServiceContainer) {
  return new Elysia({ prefix: "/api" })
    .post(
      "/chat",
      async ({ body, query }) => {
        const workerType = query.worker ?? "session";
        const result = await container.chatService.sendMessage(body.message, workerType);
        return result;
      },
      {
        body: t.Object({ message: t.String() }),
        query: t.Object({ worker: t.Optional(t.Union([t.Literal("caj"), t.Literal("session")])) }),
      },
    )
    .post(
      "/worker/callback/:jobId",
      async ({ params, body }) => {
        await container.chatService.handleCallback(params.jobId, body.result);
        return { status: "received" };
      },
      {
        params: t.Object({ jobId: t.String() }),
        body: t.Object({ result: t.String() }),
      },
    )
    .get(
      "/worker/result/:jobId",
      async ({ params }) => {
        const workerResult = await container.chatService.getResult(params.jobId);
        return {
          jobId: workerResult.jobId,
          status: workerResult.status,
          result: workerResult.result,
          elapsedMs: workerResult.elapsedMs,
        };
      },
      {
        params: t.Object({ jobId: t.String() }),
      },
    );
}
