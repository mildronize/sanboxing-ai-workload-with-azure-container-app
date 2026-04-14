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
- No auth on chat routes -- demo app, single presenter
- Dark theme, large fonts (min 18px body)

## Worker Container

- Worker code lives in `worker/` directory at repo root
- Separate from the main app -- has its own Dockerfile
- Same image for both CAJ and Dynamic Session modes
- `MODE` env var switches behavior (`job` vs `session`)

## Infrastructure

- Terraform files in `infra/` directory at repo root
- GitHub Actions in `.github/workflows/`
- Container images published to ghcr.io (public)
