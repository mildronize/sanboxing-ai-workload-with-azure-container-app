# Project Goal

Build a demo app for the Azure Global conference talk: "Sandboxing AI Workloads on Azure Container Apps".

The app demonstrates two Azure Container Apps execution models side-by-side:
- **Container Apps Job (CAJ):** Long-running, cold start, background task, destroyed after done
- **Dynamic Session (PythonLTS):** Pre-warmed, instant start, Hyper-V isolated, interactive

Backend calls Azure OpenAI (gpt-4o-mini) with tool calling to generate Python code. The generated code executes in either a PythonLTS session pool or a CAJ container — same AI-generated code, different execution environments.

## Success Criteria

- Single chat UI where presenter sends messages and toggles worker type
- Dynamic Session path: Azure OpenAI generates Python → PythonLTS executes it → instant result
- CAJ path: Azure OpenAI generates Python → CAJ container runs it → async result via callback
- Generated Python code and stdout visible in chat as separate blocks
- CAJ result appears asynchronously in chat when job completes
- Latency and worker type visible on each response
- Clean demo experience for 25-minute talk
