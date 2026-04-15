import type { IChatRepository, WorkerResult } from "./chat.repository.ts";
import type { AppContext } from "#server/context/app-context.ts";
import type { ILogger } from "#server/infrastructure/logging/index.ts";
import { ChatServiceError } from "./chat.errors.ts";
import { triggerCajJob, sendToSession } from "#server/lib/azure.ts";

interface SendMessageResult {
  response?: string;
  jobId?: string;
  status: string;
  workerType: string;
  elapsedMs?: number;
}

export class ChatService {
  private logger: ILogger;
  private appContext: AppContext;

  constructor(
    appContext: AppContext,
    private repo: IChatRepository,
  ) {
    this.appContext = appContext;
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
    this.logger.info("ChatService.triggerCajJob");

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

    if (this.appContext.config.useMockWorkers) {
      // Mock: simulate delayed callback (auto-complete after 5s for dev)
      setTimeout(() => {
        void this.handleCallback(jobId, `[Mock CAJ] Processed: "${message}"`).catch((err) => {
          this.logger.error("Mock CAJ callback failed", { jobId, error: String(err) });
        });
      }, 5000);
    } else {
      const { subscriptionId, resourceGroup, cajName, backendCallbackUrl, azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiDeploymentName } =
        this.appContext.config.azure;
      await triggerCajJob({
        subscriptionId,
        resourceGroup,
        cajName,
        message,
        callbackUrl: `${backendCallbackUrl}/api/worker/callback/${jobId}`,
        azureOpenaiEndpoint,
        azureOpenaiApiKey,
        azureOpenaiDeploymentName,
      });
    }

    return {
      jobId,
      status: "started",
      workerType: "caj",
    };
  }

  private async sendToSession(message: string): Promise<SendMessageResult> {
    this.logger.info("ChatService.sendToSession");

    const startTime = Date.now();
    let response: string;

    if (this.appContext.config.useMockWorkers) {
      // Mock: simulate a short delay
      await new Promise((resolve) => setTimeout(resolve, 150));
      response = `[Mock Session] Echo: "${message}"`;
    } else {
      const { sessionPoolEndpoint } = this.appContext.config.azure;
      const result = await sendToSession({ sessionPoolEndpoint, message });
      response = result.response;
    }

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
