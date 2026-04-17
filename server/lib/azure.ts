import { DefaultAzureCredential } from "@azure/identity";

interface TriggerCajJobParams {
  subscriptionId: string;
  resourceGroup: string;
  cajName: string;
  message: string;
  callbackUrl: string;
  azureOpenaiEndpoint: string;
  azureOpenaiApiKey: string;
  azureOpenaiDeploymentName: string;
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
  const { subscriptionId, resourceGroup, cajName, message, callbackUrl, azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiDeploymentName } = params;

  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://management.azure.com/.default");
  const accessToken = tokenResponse.token;

  const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.App/jobs/${cajName}/start?api-version=2024-03-01`;

  const body = {
    properties: {
      containers: [
        {
          env: [
            { name: "MESSAGE", value: message },
            { name: "CALLBACK_URL", value: callbackUrl },
            { name: "AZURE_OPENAI_ENDPOINT", value: azureOpenaiEndpoint },
            { name: "AZURE_OPENAI_API_KEY", value: azureOpenaiApiKey },
            { name: "AZURE_OPENAI_DEPLOYMENT_NAME", value: azureOpenaiDeploymentName },
          ],
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CAJ job trigger failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { name?: string; id?: string };
  return data.name ?? data.id ?? "unknown";
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

  const url = `${sessionPoolEndpoint}/executions?identifier=${encodeURIComponent(conversationId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, timeoutInSeconds: 30, executionType: "synchronous" }),
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
