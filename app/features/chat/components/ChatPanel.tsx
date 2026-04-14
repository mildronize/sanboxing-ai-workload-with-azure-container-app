import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
} from "@assistant-ui/react";
import { SendHorizontalIcon } from "lucide-react";
import { useChat, type WorkerMode } from "../hooks/useChat";
import { StatusBadge } from "./StatusBadge";

function WorkerModeToggle({
  mode,
  onToggle,
}: {
  mode: WorkerMode;
  onToggle: (mode: WorkerMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Worker:</span>
      <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5">
        {(
          [
            { value: "session" as const, label: "Dynamic Session" },
            { value: "caj" as const, label: "Container App Job" },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === value
                ? "bg-[var(--surface-strong)] text-[var(--sea-ink)] shadow-sm"
                : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-1 py-3">
      <MessagePrimitive.If user>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--lagoon)] px-4 py-2.5 text-sm text-white">
            <MessagePrimitive.Content />
          </div>
        </div>
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--sea-ink)]">
            <MessagePrimitive.Content />
            <ActionBarPrimitive.Root className="mt-1.5 flex items-center gap-2">
              <ActionBarPrimitive.Copy className="text-xs text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]" />
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="flex items-end gap-2 border-t border-[var(--line)] bg-[var(--surface)] p-4">
      <ComposerPrimitive.Input
        placeholder="Type a message..."
        className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--header-bg)] px-4 py-2.5 text-sm text-[var(--sea-ink)] outline-none placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon)]"
        autoFocus
      />
      <ComposerPrimitive.Send className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-[var(--lagoon)] text-white transition hover:opacity-90 disabled:opacity-50">
        <SendHorizontalIcon className="size-5" />
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

export function ChatPanel() {
  const { runtime, workerMode, setWorkerMode, messages } = useChat();

  // Extract metadata from our internal messages for status badges
  const chatMessages = messages;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-[calc(100vh-80px)] flex-col">
        {/* Header with worker mode toggle */}
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">
            Sandbox Chat
          </h2>
          <WorkerModeToggle mode={workerMode} onToggle={setWorkerMode} />
        </div>

        {/* Messages area */}
        <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
          <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
            <ThreadPrimitive.Empty>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-sm font-medium text-[var(--sea-ink)]">
                    Send a message to start chatting
                  </p>
                  <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                    Toggle between Dynamic Session and Container App Job modes above
                  </p>
                </div>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={{
                Message: ChatMessage,
              }}
            />
          </ThreadPrimitive.Viewport>

          {/* Status badges row */}
          {chatMessages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] bg-[var(--surface)] px-4 py-2">
              {chatMessages
                .filter((m) => m.role === "assistant" && m.workerType)
                .slice(-3)
                .map((m) => (
                  <StatusBadge
                    key={m.id}
                    workerType={m.workerType}
                    elapsedMs={m.elapsedMs}
                  />
                ))}
            </div>
          )}

          <Composer />
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}
