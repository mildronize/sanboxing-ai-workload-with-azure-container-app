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
          const { data, error } = await api.api.chat.post(
            { message: textContent, conversationId: conversationIdRef.current },
            { query: { worker: "session" } },
          );
          if (error) throw new Error("Failed to send message");

          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.reply ?? "",
            status: "complete",
            workerType: "session",
            elapsedMs: data.elapsedMs ?? undefined,
            code: data.code ?? undefined,
            stdout: data.stdout ?? undefined,
          };
          setMessages((prev) => [...prev, assistantMsg]);
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
