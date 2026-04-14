# Task 9: Demo UI Polish

## Objective

Polish the chat UI for conference demo: dark theme, large fonts, status badges with latency, and overall visual refinement.

## Scope

- Update Tailwind/CSS for dark theme defaults
- Increase font sizes for projector readability
- Implement StatusBadge component showing worker type + latency
- Add header badge showing current model (GPT-5.4)
- Polish loading states and transitions

## Steps

1. Set dark theme as default (no toggle needed for demo)
2. Increase base font size to 18px minimum
3. Style StatusBadge with colored pills (orange for CAJ, green for Session)
4. Add "GPT-5.4" badge in header
5. Polish chat message bubbles for readability
6. Add loading animation for CAJ pending state

## Acceptance Criteria

- Dark theme by default
- Font size readable at conference projector distance
- Every assistant message shows worker type and latency
- CAJ pending state shows clear loading indicator
- Build succeeds

## Verification

```bash
bun run build
```

## Deliverables

- Modified: `app/features/chat/components/` (multiple files)
- Modified: CSS/Tailwind config as needed
- Modified: `app/components/Header.tsx`
