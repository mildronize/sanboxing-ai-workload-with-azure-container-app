import { Elysia, t } from "elysia";
import type { ServiceContainer } from "#server/context/app-context.ts";

export function createChatRoutes(container: ServiceContainer) {
  return new Elysia({ prefix: "/api" })
    .post(
      "/chat",
      async ({ body, query }) => {
        const workerType = query.worker ?? "session";
        const result = await container.chatService.sendMessage(body.message, workerType, body.conversationId);
        return result;
      },
      {
        body: t.Object({ message: t.String(), conversationId: t.Optional(t.String()) }),
        query: t.Object({ worker: t.Optional(t.Union([t.Literal("caj"), t.Literal("session")])) }),
      },
    )
    .post(
      "/chat/generate",
      async ({ body }) => {
        const result = await container.chatService.generateCode(body.message);
        return result;
      },
      {
        body: t.Object({ message: t.String() }),
      },
    )
    .post(
      "/chat/execute",
      async ({ body }) => {
        const result = await container.chatService.executeCode(body.code, body.conversationId);
        return result;
      },
      {
        body: t.Object({ code: t.String(), conversationId: t.String() }),
      },
    )
    .post(
      "/worker/callback/:jobId",
      async ({ params, body }) => {
        await container.chatService.handleCallback(params.jobId, body.stdout);
        return { status: "received" };
      },
      {
        params: t.Object({ jobId: t.String() }),
        body: t.Object({ stdout: t.String() }),
      },
    )
    .get(
      "/worker/result/:jobId",
      async ({ params }) => {
        const workerResult = await container.chatService.getResult(params.jobId);
        return {
          jobId: workerResult.jobId,
          status: workerResult.status,
          stdout: workerResult.stdout,
          elapsedMs: workerResult.elapsedMs,
        };
      },
      {
        params: t.Object({ jobId: t.String() }),
      },
    );
}
