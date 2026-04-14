import type { PrismaClient, ChatMessage, WorkerResult } from "#generated/client/client.ts";
import type { AppContext } from "#server/context/app-context.ts";
import type { ILogger } from "#server/infrastructure/logging/index.ts";

export type { ChatMessage, WorkerResult };

export type CreateMessageData = Pick<ChatMessage, "role" | "content"> &
  Partial<Pick<ChatMessage, "workerType" | "elapsedMs" | "jobId">>;

export type CreateWorkerResultData = Pick<WorkerResult, "jobId"> &
  Partial<Pick<WorkerResult, "status" | "result" | "elapsedMs">>;

export type UpdateWorkerResultData = Partial<Pick<WorkerResult, "status" | "result" | "elapsedMs">>;

export interface IChatRepository {
  createMessage(data: CreateMessageData): Promise<ChatMessage>;
  createWorkerResult(data: CreateWorkerResultData): Promise<WorkerResult>;
  getWorkerResult(jobId: string): Promise<WorkerResult | null>;
  updateWorkerResult(jobId: string, data: UpdateWorkerResultData): Promise<WorkerResult | null>;
}

export class PrismaChatRepository implements IChatRepository {
  private logger: ILogger;

  constructor(
    appContext: AppContext,
    private prisma: PrismaClient,
  ) {
    this.logger = appContext.logger;
  }

  createMessage(data: CreateMessageData): Promise<ChatMessage> {
    this.logger.info("PrismaChatRepository.createMessage", { role: data.role });
    return this.prisma.chatMessage.create({ data });
  }

  createWorkerResult(data: CreateWorkerResultData): Promise<WorkerResult> {
    this.logger.info("PrismaChatRepository.createWorkerResult", { jobId: data.jobId });
    return this.prisma.workerResult.create({ data });
  }

  getWorkerResult(jobId: string): Promise<WorkerResult | null> {
    this.logger.debug("PrismaChatRepository.getWorkerResult", { jobId });
    return this.prisma.workerResult.findUnique({ where: { jobId } });
  }

  async updateWorkerResult(jobId: string, data: UpdateWorkerResultData): Promise<WorkerResult | null> {
    this.logger.info("PrismaChatRepository.updateWorkerResult", { jobId });
    try {
      return await this.prisma.workerResult.update({ where: { jobId }, data });
    } catch {
      return null;
    }
  }
}
