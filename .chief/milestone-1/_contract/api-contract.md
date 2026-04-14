# API Contract -- Chat Module

## POST /api/chat

Send a message and trigger a worker.

**Query params:**
- `worker` -- `"caj"` or `"session"` (default: `"session"`)

**Request body:**
```json
{
  "message": "string"
}
```

**Response (session mode):**
```json
{
  "response": "string",
  "elapsedMs": 180,
  "workerType": "session"
}
```

**Response (CAJ mode):**
```json
{
  "jobId": "string",
  "status": "started",
  "workerType": "caj"
}
```

## POST /api/worker/callback/:jobId

CAJ worker posts result back when job completes.

**Request body:**
```json
{
  "result": "string"
}
```

**Response:**
```json
{
  "status": "received"
}
```

## GET /api/worker/result/:jobId

Frontend polls this to check if CAJ result is ready.

**Response (pending):**
```json
{
  "jobId": "string",
  "status": "pending"
}
```

**Response (done):**
```json
{
  "jobId": "string",
  "status": "done",
  "result": "string",
  "elapsedMs": 202000
}
```

## Backend Service Responsibilities

### ChatService

- `sendMessage(message, workerType)` -- route to appropriate worker
- `triggerCajJob(message)` -- call Azure REST API to start CAJ, create WorkerResult record
- `sendToSession(message)` -- HTTP request to Dynamic Session pool endpoint
- `handleCallback(jobId, result)` -- store result from CAJ callback
- `getResult(jobId)` -- return current status of a CAJ job

### Azure Integration

- CAJ trigger: Azure REST API `POST` to start a manual job execution
- Dynamic Session: HTTP POST to session pool management endpoint with `DefaultAzureCredential`
- Both require env vars for Azure resource IDs, subscription, etc.
