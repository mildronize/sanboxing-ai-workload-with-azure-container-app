import type { IChatRepository, WorkerResult } from "./chat.repository.ts";
import type { AppContext } from "#server/context/app-context.ts";
import type { ILogger } from "#server/infrastructure/logging/index.ts";
import { ChatServiceError } from "./chat.errors.ts";

interface SendMessageResult {
  response?: string;
  jobId?: string;
  status: string;
  workerType: string;
  elapsedMs?: number;
}

export class ChatService {
  private logger: ILogger;

  constructor(
    appContext: AppContext,
    private repo: IChatRepository,
  ) {
    this.logger = appContext.logger;
  }

  async sendMessage(message: string, workerType: string): Promise<SendMessageResult> {
    this.logger.info("ChatService.sendMessage", { workerType });

    // Store user message
    await this.repo.createMessage({
      role: "user",
      content: message,
      workerType,
    });

    if (workerType === "caj") {
      return this.triggerCajJob(message);
    }
    return this.sendToSession(message);
  }

  private async triggerCajJob(message: string): Promise<SendMessageResult> {
    this.logger.info("ChatService.triggerCajJob (mock)");

    const jobId = `caj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create pending worker result
    await this.repo.createWorkerResult({
      jobId,
      status: "pending",
    });

    // Store assistant placeholder message
    await this.repo.createMessage({
      role: "assistant",
      content: "",
      workerType: "caj",
      jobId,
    });

    // Mock: simulate delayed callback (auto-complete after 5s for dev)
    setTimeout(() => {
      void this.handleCallback(jobId, `[Mock CAJ] Processed: "${message}"`).catch((err) => {
        this.logger.error("Mock CAJ callback failed", { jobId, error: String(err) });
      });
    }, 5000);

    return {
      jobId,
      status: "started",
      workerType: "caj",
    };
  }

  private async sendToSession(message: string): Promise<SendMessageResult> {
    this.logger.info("ChatService.sendToSession (mock)");

    const startTime = Date.now();

    // Mock: simulate a short delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    const response = `[Mock Session] Echo: "${message}"`;
    const elapsedMs = Date.now() - startTime;

    // Store assistant message
    await this.repo.createMessage({
      role: "assistant",
      content: response,
      workerType: "session",
      elapsedMs,
    });

    return {
      response,
      elapsedMs,
      workerType: "session",
      status: "done",
    };
  }

  async handleCallback(jobId: string, result: string): Promise<void> {
    this.logger.info("ChatService.handleCallback", { jobId });

    const workerResult = await this.repo.getWorkerResult(jobId);
    if (!workerResult) {
      throw new ChatServiceError("Worker result not found", 404);
    }

    const elapsedMs = Date.now() - workerResult.createdAt.getTime();

    await this.repo.updateWorkerResult(jobId, {
      status: "done",
      result,
      elapsedMs,
    });
  }

  async getResult(jobId: string): Promise<WorkerResult> {
    this.logger.debug("ChatService.getResult", { jobId });

    const workerResult = await this.repo.getWorkerResult(jobId);
    if (!workerResult) {
      throw new ChatServiceError("Worker result not found", 404);
    }

    return workerResult;
  }
}
