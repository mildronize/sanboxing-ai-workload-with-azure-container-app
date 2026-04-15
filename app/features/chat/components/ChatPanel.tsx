import { createContext, useContext } from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { SendHorizontalIcon } from "lucide-react";
import { useChat, type WorkerMode } from "../hooks/useChat";
import { StatusBadge } from "./StatusBadge";

// Context to share message metadata (workerType, elapsedMs, status) with ChatMessage
interface MessageMeta {
  workerType?: string;
  elapsedMs?: number;
  status?: "complete" | "running" | "incomplete";
}

const MessageMetaContext = createContext<Map<number, MessageMeta>>(new Map());

function WorkerModeToggle({
  mode,
  onToggle,
}: {
  mode: WorkerMode;
  onToggle: (mode: WorkerMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-[var(--sea-ink-soft)]">Worker:</span>
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
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
  const messageIndex = useAuiState((s) => s.message.index);
  const metaMap = useContext(MessageMetaContext);

  const meta = metaMap.get(messageIndex);
  const isPending = meta?.status === "running";

  return (
    <MessagePrimitive.Root className="flex flex-col gap-1 py-4">
      <MessagePrimitive.If user>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--lagoon)] px-5 py-3 text-lg text-white">
            <MessagePrimitive.Content />
          </div>
        </div>
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        <div className="flex flex-col items-start gap-2">
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-lg text-[var(--sea-ink)]">
            {isPending ? (
              <div className="flex items-center gap-3 text-[var(--sea-ink-soft)]">
                <span className="text-base">Processing</span>
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--lagoon)] [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--lagoon)] [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--lagoon)] [animation-delay:300ms]" />
                </span>
              </div>
            ) : (
              <MessagePrimitive.Content />
            )}
            <ActionBarPrimitive.Root className="mt-2 flex items-center gap-2">
              <ActionBarPrimitive.Copy className="text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]" />
            </ActionBarPrimitive.Root>
          </div>
          {meta?.workerType && (
            <div className="pl-1">
              <StatusBadge
                workerType={meta.workerType}
                elapsedMs={meta.elapsedMs}
                isPending={isPending}
              />
            </div>
          )}
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
        className="min-h-[52px] flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--header-bg)] px-4 py-3 text-lg text-[var(--sea-ink)] outline-none placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon)]"
        autoFocus
      />
      <ComposerPrimitive.Send className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[var(--lagoon)] text-white transition hover:opacity-90 disabled:opacity-50">
        <SendHorizontalIcon className="size-6" />
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

export function ChatPanel() {
  const { runtime, workerMode, setWorkerMode, messages } = useChat();

  // Build an index-based map of message metadata for assistant messages.
  // The thread message index corresponds to position in the messages array.
  const metaMap = new Map<number, MessageMeta>();
  messages.forEach((msg, idx) => {
    if (msg.role === "assistant") {
      metaMap.set(idx, {
        workerType: msg.workerType,
        elapsedMs: msg.elapsedMs,
        status: msg.status,
      });
    }
  });

  return (
    // Force dark theme on the chat page for projector visibility
    <div data-theme="dark" className="min-h-[calc(100vh-80px)] bg-[var(--bg-base)]">
      <AssistantRuntimeProvider runtime={runtime}>
        <MessageMetaContext.Provider value={metaMap}>
          <div className="flex h-[calc(100vh-80px)] flex-col">
            {/* Chat panel header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-[var(--sea-ink)]">
                  Sandbox Chat
                </h2>
                {/* Azure OpenAI model badge */}
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lagoon)]/40 bg-[var(--lagoon)]/10 px-2.5 py-0.5 text-sm font-semibold text-[var(--lagoon-deep)]">
                  Azure OpenAI
                </span>
              </div>
              <WorkerModeToggle mode={workerMode} onToggle={setWorkerMode} />
            </div>

            {/* Messages area */}
            <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
              <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-5">
                <ThreadPrimitive.Empty>
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
                      <p className="text-lg font-semibold text-[var(--sea-ink)]">
                        Send a message to start chatting
                      </p>
                      <p className="mt-2 text-base text-[var(--sea-ink-soft)]">
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

              <Composer />
            </ThreadPrimitive.Root>
          </div>
        </MessageMetaContext.Provider>
      </AssistantRuntimeProvider>
    </div>
  );
}
