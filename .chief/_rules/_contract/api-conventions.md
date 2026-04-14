# API Conventions

## Route Prefix

All API routes use `/api/` prefix.

## Chat Module Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/chat` | None | Send message, trigger worker |
| `POST` | `/api/worker/callback/:jobId` | None | CAJ worker posts result back |
| `GET` | `/api/worker/result/:jobId` | None | Frontend polls for CAJ result |

## Request/Response Format

All JSON. No streaming -- assistant-ui uses `ExternalStoreRuntime` with polling.

## Worker Type Selection

Query param `?worker=caj` or `?worker=session` on `POST /api/chat`.
Default: `session`.
