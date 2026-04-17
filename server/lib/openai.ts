import { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type { ChatCompletionMessageParam };

export const SYSTEM_PROMPT =
  "You are a Python code execution assistant. You MUST use the execute_python tool for every request. Always write Python code to answer questions — never answer with plain text only.";

export const EXECUTE_PYTHON_TOOL = {
  type: "function" as const,
  function: {
    name: "execute_python",
    description: "Execute Python code in a secure sandbox and return stdout",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Python code to execute" },
      },
      required: ["code"],
    },
  },
};

export interface OpenAIClientConfig {
  azureOpenaiEndpoint: string;
  azureOpenaiApiKey: string;
  azureOpenaiDeploymentName: string;
}

export function createOpenAIClient(config: OpenAIClientConfig): AzureOpenAI {
  return new AzureOpenAI({
    endpoint: config.azureOpenaiEndpoint,
    apiKey: config.azureOpenaiApiKey,
    apiVersion: "2025-01-01-preview",
    deployment: config.azureOpenaiDeploymentName,
  });
}

export function buildInitialMessages(userMessage: string): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];
}

export interface GeneratePythonCodeResult {
  code: string;
  reply: string;
}

export async function generatePythonCode(
  messages: ChatCompletionMessageParam[],
  client: AzureOpenAI,
): Promise<GeneratePythonCodeResult> {
  try {
    const response = await client.chat.completions.create({
      model: "",
      messages,
      tools: [EXECUTE_PYTHON_TOOL],
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.type === "function") {
        const args = JSON.parse(toolCall.function.arguments) as { code: string };
        return { code: args.code, reply: "" };
      }
    }

    return { code: "", reply: choice.message.content ?? "" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { code: "", reply: `Azure OpenAI error: ${errorMessage}` };
  }
}
