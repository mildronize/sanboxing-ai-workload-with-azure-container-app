# Task 7: Frontend -- Code + Stdout Display Blocks

## Objective

Update the chat frontend to render generated Python code and stdout as separate visual blocks in assistant messages, and send `conversationId` with each request.

## Scope

- Generate and persist `conversationId` (UUID) on mount
- Send `conversationId` in POST body
- Parse `code` and `stdout` from API responses
- Render code block (syntax highlighted or monospace) and stdout block separately
- Handle both session (synchronous) and CAJ (poll) paths

## Files to Modify

- `app/features/chat/hooks/useChat.ts` (conversationId, parse new response fields)
- `app/features/chat/components/ChatPanel.tsx` (render code + stdout blocks)

## Dependencies

- Task 6 (routes return new shape)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md` -- feature pattern, types from Eden
- `.chief/milestone-2/_goal/goal.md` -- Decision #6 (conversationId), Decision #11 (frontend changes)

## Steps

1. In `useChat.ts`:
   - Generate `conversationId` via `crypto.randomUUID()` on hook init (useState with lazy init)
   - Add `code` and `stdout` fields to `ChatMessage` interface
   - Send `conversationId` in POST body
   - Parse `code`, `stdout`, `reply` from session response
   - Parse `code` from CAJ trigger response
   - Parse `stdout` from CAJ poll response
2. In `ChatPanel.tsx`:
   - Create a `CodeBlock` component (monospace, dark bg, with "Python" label)
   - Create a `StdoutBlock` component (monospace, slightly different styling)
   - Render code + stdout blocks inside assistant messages when present
   - If only `reply` text: render as before
   - Pass code/stdout via the MessageMetaContext

## Acceptance Criteria

- `conversationId` sent with every chat request
- Code block rendered with monospace font and clear label
- Stdout block rendered separately
- Both session and CAJ paths display code + stdout
- CAJ placeholder still shows "Processing..." animation
- No intermediate step indicators for session path (it's synchronous)

## Verification

```bash
bunx tsc --noEmit
bun run build
```

## Deliverables

- Updated `app/features/chat/hooks/useChat.ts`
- Updated `app/features/chat/components/ChatPanel.tsx`
