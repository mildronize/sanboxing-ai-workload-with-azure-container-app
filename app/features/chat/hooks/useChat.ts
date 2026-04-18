import { useState, useCallback, useRef } from "react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import type { ThreadMessageLike, AppendMessage } from "@assistant-ui/react";
import { api } from "#/lib/eden";

export type WorkerMode = "caj" | "session";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "running" | "incomplete";
  workerType?: string;
  elapsedMs?: number;
  code?: string;
  stdout?: string;
}

function convertMessage(msg: ChatMessage): ThreadMessageLike {
  if (msg.role === "assistant") {
    const status =
      msg.status === "running"
        ? ({ type: "running" } as const)
        : msg.status === "incomplete"
          ? ({ type: "incomplete", reason: "error" } as const)
          : ({ type: "complete", reason: "stop" } as const);

    return {
      role: "assistant",
      content: msg.content,
      status,
    };
  }

  return {
    role: msg.role,
    content: msg.content,
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [workerMode, setWorkerMode] = useState<WorkerMode>("session");
  // conversationId provides session affinity for PythonLTS kernel across messages
  const conversationIdRef = useRef<string>(`conv-${crypto.randomUUID()}`);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const textContent = message.content
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("\n");

      if (!textContent.trim()) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: textContent,
        status: "complete",
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsRunning(true);

      try {
        if (workerMode === "session") {
          // Step 1: Show "Thinking..." while generating code
          const thinkingId = `assistant-thinking-${Date.now()}`;
          setMessages((prev) => [...prev, {
            id: thinkingId,
            role: "assistant" as const,
            content: "Thinking...",
            status: "running" as const,
            workerType: "session",
          }]);

          const { data: genData, error: genError } = await api.api.chat.generate.post(
            { message: textContent },
          );
          if (genError) throw new Error("Failed to generate code");

          // Step 2: Show the generated code, update status to "Executing..."
          setMessages((prev) => prev.map((m) =>
            m.id === thinkingId
              ? { ...m, content: "Executing...", code: genData.code || undefined }
              : m,
          ));

          // Step 3: Execute the code
          const { data: execData, error: execError } = await api.api.chat.execute.post(
            { code: genData.code, conversationId: conversationIdRef.current },
          );
          if (execError) throw new Error("Failed to execute code");

          // Step 4: Show final result
          setMessages((prev) => prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: execData.reply ?? "",
                  status: "complete" as const,
                  elapsedMs: execData.elapsedMs ?? undefined,
                  stdout: execData.stdout ?? undefined,
                }
              : m,
          ));
        } else {
          // CAJ mode: start job then poll
          const { data, error } = await api.api.chat.post(
            { message: textContent, conversationId: conversationIdRef.current },
            { query: { worker: "caj" } },
          );
          if (error) throw new Error("Failed to send message");

          const jobId = data.jobId;
          if (!jobId) throw new Error("No jobId returned");

          // Capture code returned from the CAJ trigger response
          const cajCode = data.code ?? undefined;

          // Add placeholder assistant message
          const placeholderId = `assistant-caj-${Date.now()}`;
          const placeholderMsg: ChatMessage = {
            id: placeholderId,
            role: "assistant",
            content: "Processing...",
            status: "running",
            workerType: "caj",
            code: cajCode,
          };
          setMessages((prev) => [...prev, placeholderMsg]);

          // Poll for result
          const pollInterval = setInterval(async () => {
            try {
              const { data: resultData, error: resultError } =
                await api.api.worker.result({ jobId }).get();
              if (resultError) return;

              if (resultData.status === "done") {
                clearInterval(pollInterval);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId
                      ? {
                          ...m,
                          content: "",
                          status: "complete" as const,
                          elapsedMs: resultData.elapsedMs ?? undefined,
                          stdout: resultData.stdout ?? undefined,
                        }
                      : m,
                  ),
                );
                setIsRunning(false);
              }
            } catch {
              // Keep polling on error
            }
          }, 3000);

          // Don't set isRunning=false here, the poll interval handles it
          return;
        }
      } catch {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "An error occurred while processing your message.",
          status: "incomplete",
        };
        setMessages((prev) => [...prev, errorMsg]);
      }

      setIsRunning(false);
    },
    [workerMode],
  );

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage,
    onNew,
  });

  return { runtime, workerMode, setWorkerMode, messages };
}
