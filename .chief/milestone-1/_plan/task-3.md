# Task 3: Create Chat Frontend Feature with assistant-ui

## Objective

Build the chat UI using assistant-ui with `useExternalStoreRuntime`. The UI connects to the backend endpoints from task-2. Supports both CAJ (polling) and Dynamic Session (synchronous) worker modes.

## Scope

- Install assistant-ui packages
- Create `app/features/chat/` feature module
- Add `/chat` route
- Wire up `useExternalStoreRuntime` with backend API

## Rules & Contracts

- `.chief/milestone-1/_contract/api-contract.md` -- API shapes
- `.chief/_rules/_standard/coding-standards.md` -- frontend patterns
- `.claude/skills/assistant-ui/SKILL.md` -- assistant-ui usage guide
- `CLAUDE.md` -- feature isolation, Eden types

## Steps

1. Install packages:
   ```bash
   bun add @assistant-ui/react @assistant-ui/react-markdown
   ```

2. Create `app/features/chat/hooks/useChat.ts`:
   - Manage `messages` state as `ThreadMessage[]` (assistant-ui format)
   - Manage `isRunning` state
   - Implement `onNew` handler:
     - For session mode: POST to `/api/chat?worker=session`, await response, add assistant message
     - For CAJ mode: POST to `/api/chat?worker=caj`, get jobId, add placeholder message, start polling `/api/worker/result/:jobId` every 3s, replace placeholder when done
   - Track `workerMode` state (`"caj"` | `"session"`) with a toggle
   - Build and return `useExternalStoreRuntime` with messages, isRunning, onNew

3. Create `app/features/chat/components/ChatPanel.tsx`:
   - Wrap assistant-ui `Thread` component with `AssistantRuntimeProvider`
   - Use the runtime from `useChat` hook
   - Include worker mode toggle (button/switch to flip between CAJ and Session)

4. Create `app/features/chat/components/StatusBadge.tsx`:
   - Display worker type and latency on assistant messages
   - Format: "CAJ | 3m 22s" or "Dynamic Session | 180ms"

5. Create `app/features/chat/index.ts` -- barrel export

6. Add route `app/routes/chat.tsx`:
   - Thin route importing `ChatPanel` from feature
   - Register in TanStack Router

7. Add navigation link to chat page in shared Header component

## Acceptance Criteria

- `/chat` route renders the assistant-ui chat interface
- Typing a message and sending calls `POST /api/chat`
- Session mode: response appears immediately in chat
- CAJ mode: placeholder appears, then result replaces it after polling
- Worker mode toggle switches between CAJ and Session
- assistant-ui Thread component renders correctly with messages
- Type check passes
- Build succeeds

## Verification

```bash
bunx tsc --noEmit
bun run build
```

## Deliverables

- New: `app/features/chat/hooks/useChat.ts`
- New: `app/features/chat/components/ChatPanel.tsx`
- New: `app/features/chat/components/StatusBadge.tsx`
- New: `app/features/chat/index.ts`
- New: `app/routes/chat.tsx`
- Modified: `app/components/Header.tsx` (add chat nav link)
- Modified: `package.json` (new dependencies)
