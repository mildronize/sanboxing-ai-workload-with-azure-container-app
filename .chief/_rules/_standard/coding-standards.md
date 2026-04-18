# Coding Standards

## General

- Runtime: Bun
- Language: TypeScript (strict mode)
- Never use `console.log` -- use `ILogger` via `appContext.logger`
- Never use `any` type without `eslint-disable` comment explaining why
- Use path aliases: `#server/*`, `#generated/*`, `#/*`

## Backend (Elysia)

- Module pattern: `server/modules/<name>/` with repository, service, routes, errors
- Route factories: `export function create<Name>Routes(container: ServiceContainer)`
- DI via `createContainer()` -- never use Elysia `.decorate()` for services
- Auth via `{ withAuth: true }` macro -- never inline auth checks
- Validation: use prismabox schemas from `#generated/prismabox/`. Use `t.Pick`/`t.Partial` for variants
- Types from Prisma-generated client -- never declare manual model interfaces
- For non-Prisma data (Azure API responses, external types): declare manual interfaces in the module

## Frontend (React)

- Feature pattern: `app/features/<name>/` with components and hooks
- Types from Eden Treaty -- never duplicate server types
- API calls via Eden + React Query hooks
- Shared components in `app/components/`
- Routes are thin wrappers importing from features

## Chat Feature Specifics

- assistant-ui with `useExternalStoreRuntime` (not AI SDK runtime)
- Chat routes require auth via `{ withAuth: true }` macro (POST /chat, /chat/generate, /chat/execute)
- Worker callback/poll routes stay public (called by the worker, not the browser)
- Dark theme, large fonts (min 18px body)

## Worker Container

- Worker code lives in `worker/` directory at repo root
- Separate from the main app -- has its own Dockerfile
- M1: Same image for both CAJ and Dynamic Session modes (`MODE` env var)
- M2+: Worker container is CAJ-only (minimal Python). Session path uses PythonLTS (managed by Microsoft)

## Infrastructure

- Terraform files in `terraform/` directory at repo root
- GitHub Actions in `.github/workflows/`
- Container images published to ghcr.io (public)
