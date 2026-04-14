FROM node:22-alpine

# Install Bun (required for server.ts which uses Bun.serve and Bun shell $)
RUN npm install -g bun

# Install OpenCode AI CLI
RUN npm install -g opencode-ai

# Install curl and jq for callback POST in job mode
RUN apk add --no-cache curl jq

# Pre-configure OpenCode with GPT-5.4
COPY opencode-config /root/.config/opencode/

# Copy entrypoint and HTTP server
COPY entrypoint.sh /entrypoint.sh
COPY server.ts /app/server.ts
RUN chmod +x /entrypoint.sh

WORKDIR /app

# Default: HTTP server mode (for Dynamic Sessions)
CMD ["/entrypoint.sh"]
