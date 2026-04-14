import { DefaultAzureCredential } from "@azure/identity";

interface TriggerCajJobParams {
  subscriptionId: string;
  resourceGroup: string;
  cajName: string;
  message: string;
  callbackUrl: string;
  openaiApiKey: string;
}

interface SendToSessionParams {
  sessionPoolEndpoint: string;
  message: string;
  sessionId?: string;
}

interface SendToSessionResult {
  response: string;
}

export async function triggerCajJob(params: TriggerCajJobParams): Promise<string> {
  const { subscriptionId, resourceGroup, cajName, message, callbackUrl, openaiApiKey } = params;

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
            { name: "OPENAI_API_KEY", value: openaiApiKey },
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

export async function sendToSession(params: SendToSessionParams): Promise<SendToSessionResult> {
  const { sessionPoolEndpoint, message, sessionId } = params;
  const resolvedSessionId = sessionId ?? `session-${Date.now()}`;

  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://dynamicsessions.io/.default");
  const accessToken = tokenResponse.token;

  const url = `https://${sessionPoolEndpoint}/chat?identifier=${resolvedSessionId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dynamic session request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { response?: string };
  return { response: data.response ?? "" };
}
