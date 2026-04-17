import type { IChatRepository, WorkerResult } from "./chat.repository.ts";
import type { AppContext } from "#server/context/app-context.ts";
import type { ILogger } from "#server/infrastructure/logging/index.ts";
import type { ChatCompletionMessageParam } from "#server/lib/openai.ts";
import { ChatServiceError } from "./chat.errors.ts";
import { triggerCajJob, sendToSession } from "#server/lib/azure.ts";
import { generatePythonCode, buildInitialMessages, createOpenAIClient } from "#server/lib/openai.ts";

const MAX_AGENT_ITERATIONS = 5;

export interface SendMessageResult {
  reply?: string;
  code?: string;
  stdout?: string;
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

  async sendMessage(message: string, workerType: string, conversationId?: string): Promise<SendMessageResult> {
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
    return this.sendToSession(message, conversationId ?? `session-${Date.now()}`);
  }

  private async triggerCajJob(message: string): Promise<SendMessageResult> {
    this.logger.info("ChatService.triggerCajJob");

    const jobId = `caj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let code: string;

    if (this.appContext.config.useMockWorkers) {
      // Mock: return fake code, simulate delayed callback
      code = `# [Mock] Generated for: ${message}\nprint("Mock result")`;
    } else {
      // Call Azure OpenAI to generate Python code
      const { azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiDeploymentName } = this.appContext.config.azure;
      const client = createOpenAIClient({ azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiDeploymentName });
      const messages = buildInitialMessages(message);
      const result = await generatePythonCode(messages, client);
      code = result.code;
    }

    // Create pending worker result
    await this.repo.createWorkerResult({
      jobId,
      status: "pending",
    });

    // Store assistant placeholder message with generated code
    await this.repo.createMessage({
      role: "assistant",
      content: "",
      workerType: "caj",
      jobId,
      code,
    });

    if (this.appContext.config.useMockWorkers) {
      // Mock: simulate delayed callback (auto-complete after 5s for dev)
      setTimeout(() => {
        void this.handleCallback(jobId, `[Mock CAJ] Processed: "${message}"`).catch((err) => {
          this.logger.error("Mock CAJ callback failed", { jobId, error: String(err) });
        });
      }, 5000);
    } else {
      const { subscriptionId, resourceGroup, cajName, backendCallbackUrl } = this.appContext.config.azure;
      await triggerCajJob({
        subscriptionId,
        resourceGroup,
        cajName,
        code,
        callbackUrl: `${backendCallbackUrl}/api/worker/callback/${jobId}`,
      });
    }

    return {
      jobId,
      code,
      status: "started",
      workerType: "caj",
    };
  }

  private async sendToSession(message: string, conversationId: string): Promise<SendMessageResult> {
    this.logger.info("ChatService.sendToSession", { conversationId });

    const startTime = Date.now();

    if (this.appContext.config.useMockWorkers) {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const mockCode = `print("Hello from mock session!")`;
      const mockStdout = "Hello from mock session!\n";
      const mockReply = `[Mock Session] Executed Python code for: "${message}"`;
      const elapsedMs = Date.now() - startTime;

      await this.repo.createMessage({
        role: "assistant",
        content: mockReply,
        workerType: "session",
        code: mockCode,
        stdout: mockStdout,
        elapsedMs,
      });

      return {
        reply: mockReply,
        code: mockCode,
        stdout: mockStdout,
        elapsedMs,
        workerType: "session",
        status: "done",
      };
    }

    const { azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiDeploymentName, sessionPoolEndpoint } =
      this.appContext.config.azure;

    const client = createOpenAIClient({ azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiDeploymentName });
    const messages: ChatCompletionMessageParam[] = buildInitialMessages(message);

    let lastCode = "";
    let lastStdout = "";
    let lastReply = "";

    for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
      this.logger.info("ChatService.sendToSession agent iteration", { iteration, conversationId });

      const { code, reply } = await generatePythonCode(messages, client);

      if (!code) {
        // Model returned plain text with no code to execute
        lastReply = reply;
        break;
      }

      lastCode = code;

      const executionResult = await sendToSession({ sessionPoolEndpoint, code, conversationId });

      this.logger.info("ChatService.sendToSession execution complete", {
        iteration,
        conversationId,
        hasStderr: executionResult.stderr.length > 0,
      });

      if (!executionResult.stderr) {
        // Execution succeeded — make a second OpenAI call with tool result to get formatted reply
        const followUpMessages: ChatCompletionMessageParam[] = [
          ...messages,
          {
            role: "assistant" as const,
            content: null,
            tool_calls: [
              {
                id: `call_${iteration}`,
                type: "function" as const,
                function: { name: "execute_python", arguments: JSON.stringify({ code }) },
              },
            ],
          },
          {
            role: "tool" as const,
            tool_call_id: `call_${iteration}`,
            content: executionResult.stdout,
          },
        ];

        const { reply: formattedReply } = await generatePythonCode(followUpMessages, client);
        lastStdout = executionResult.stdout;
        lastReply = formattedReply || executionResult.stdout;
        break;
      }

      // Execution produced stderr — feed error back for self-correction
      this.logger.warn("ChatService.sendToSession stderr detected, retrying", {
        iteration,
        stderr: executionResult.stderr,
      });

      messages.push(
        {
          role: "assistant" as const,
          content: null,
          tool_calls: [
            {
              id: `call_${iteration}`,
              type: "function" as const,
              function: { name: "execute_python", arguments: JSON.stringify({ code }) },
            },
          ],
        },
        {
          role: "tool" as const,
          tool_call_id: `call_${iteration}`,
          content: `stderr: ${executionResult.stderr}`,
        },
        {
          role: "user" as const,
          content: `The code produced an error. Please fix it:\n\nstderr:\n${executionResult.stderr}`,
        },
      );

      // On last iteration, get model's explanation for the failure
      if (iteration === MAX_AGENT_ITERATIONS - 1) {
        const { reply: explanation } = await generatePythonCode(messages, client);
        lastStdout = executionResult.stderr;
        lastReply = explanation || `Execution failed after ${MAX_AGENT_ITERATIONS} attempts. Last error: ${executionResult.stderr}`;
      } else {
        lastStdout = executionResult.stderr;
      }
    }

    const elapsedMs = Date.now() - startTime;

    await this.repo.createMessage({
      role: "assistant",
      content: lastReply,
      workerType: "session",
      code: lastCode || undefined,
      stdout: lastStdout || undefined,
      elapsedMs,
    });

    return {
      reply: lastReply,
      code: lastCode || undefined,
      stdout: lastStdout || undefined,
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
      stdout: result,
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
