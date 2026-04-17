import { DefaultAzureCredential } from "@azure/identity";
import { ContainerAppsAPIClient } from "@azure/arm-appcontainers";

interface TriggerCajJobParams {
  subscriptionId: string;
  resourceGroup: string;
  cajName: string;
  cajWorkerImage: string;
  code: string;
  callbackUrl: string;
}

interface SendToSessionParams {
  sessionPoolEndpoint: string;
  code: string;
  conversationId: string;
}

interface SendToSessionResult {
  stdout: string;
  stderr: string;
  executionTimeInMilliseconds: number;
}

export async function triggerCajJob(params: TriggerCajJobParams): Promise<string> {
  const { subscriptionId, resourceGroup, cajName, cajWorkerImage, code, callbackUrl } = params;

  const credential = new DefaultAzureCredential();
  const client = new ContainerAppsAPIClient(credential, subscriptionId);

  const result = await client.jobs.beginStartAndWait(resourceGroup, cajName, {
    template: {
      containers: [
        {
          name: "worker",
          image: cajWorkerImage,
          env: [
            { name: "CODE", value: code },
            { name: "CALLBACK_URL", value: callbackUrl },
          ],
        },
      ],
    },
  });

  return result.name ?? "unknown";
}

interface ExecutionResponse {
  id: string;
  identifier: string;
  executionType: string;
  status: string;
  result: {
    stdout: string;
    stderr: string;
    executionResult: unknown;
    executionTimeInMilliseconds: number;
  };
}

export async function sendToSession(params: SendToSessionParams): Promise<SendToSessionResult> {
  const { sessionPoolEndpoint, code, conversationId } = params;

  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://dynamicsessions.io/.default");
  const accessToken = tokenResponse.token;

  const url = `${sessionPoolEndpoint}/executions?api-version=2024-10-02-preview&identifier=${encodeURIComponent(conversationId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, codeInputType: "inline", timeoutInSeconds: 30, executionType: "synchronous" }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dynamic session request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as ExecutionResponse;
  return {
    stdout: data.result.stdout ?? "",
    stderr: data.result.stderr ?? "",
    executionTimeInMilliseconds: data.result.executionTimeInMilliseconds ?? 0,
  };
}
