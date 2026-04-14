# TODO List for Milestone 1

## Batch 1: Backend Foundation

- [x] task-1: Add Prisma models (ChatMessage, WorkerResult) and regenerate client
- [x] task-2: Create chat backend module (repository, service, routes) with in-memory worker stubs
- [x] task-3: Create chat frontend feature with assistant-ui (ExternalStoreRuntime)

## Batch 2: Worker Container + Azure Integration

- [x] task-4: Build worker container image (Dockerfile, entrypoint, HTTP server)
- [x] task-5: Add Azure integration to chat service (CAJ trigger + Dynamic Session HTTP)

## Batch 3: Infrastructure

- [ ] task-6: Terraform configuration for Azure resources
- [ ] task-7: Root Dockerfile for backend app container

## Batch 4: CI/CD + Polish

- [ ] task-8: GitHub Actions workflows (build-push + deploy)
- [ ] task-9: Demo UI polish (dark theme, large fonts, status badges, latency display)
- [ ] task-10: App Dockerfile for backend container
