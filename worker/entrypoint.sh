#!/bin/sh
# entrypoint.sh
# Switches between job mode (CAJ) and session mode (Dynamic Sessions)
# based on the MODE environment variable.

if [ "$MODE" = "job" ]; then
  # === CAJ mode: long-running task ===
  # Run OpenCode non-interactively and capture output
  REPORT=$(opencode -p "$MESSAGE" -q)
  echo "$REPORT" > /tmp/report.md

  # Optional padding for demo purposes
  if [ -n "$EXTRA_SLEEP_SECONDS" ]; then
    sleep "$EXTRA_SLEEP_SECONDS"
  fi

  # POST result back to the backend via callback URL
  curl -s -X POST "$CALLBACK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"result\": $(cat /tmp/report.md | jq -Rs .)}"
else
  # === Dynamic Session mode: HTTP server ===
  bun run /app/server.ts
fi
