# Project Goal

Build a demo app for the Azure Global conference talk: "Sandboxing AI Workloads on Azure Container Apps".

The app demonstrates two Azure Container Apps execution models side-by-side:
- **Container Apps Job (CAJ):** Long-running, cold start, background task
- **Dynamic Session (Custom Container):** Pre-warmed, instant start, interactive

Both use the same worker container image running OpenCode with GPT-5.4.

## Success Criteria

- Single chat UI where presenter sends messages
- First message triggers CAJ worker (visible cold start delay)
- Subsequent messages use Dynamic Session (instant response)
- CAJ result appears asynchronously in chat when job completes
- Latency and worker type visible on each response
- Clean demo experience for 25-minute talk
