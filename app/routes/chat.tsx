import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatPanel } from "#/features/chat";
import { useSession } from "#/lib/auth-client";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function ChatPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) {
      void navigate({ to: "/login" });
    }
  }, [isPending, session, navigate]);

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <p className="text-[var(--sea-ink-soft)]">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <ChatPanel />;
}
