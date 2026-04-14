# Prisma Schema Contract -- Chat Feature

Add to `prisma/schema.prisma`:

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  role      String   // "user" | "assistant"
  content   String
  workerType String? // "caj" | "session" | null
  elapsedMs  Int?    // response time in ms
  jobId     String?  // CAJ job ID reference
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WorkerResult {
  id        String   @id @default(cuid())
  jobId     String   @unique
  status    String   @default("pending") // "pending" | "done" | "error"
  result    String?  // response content
  elapsedMs Int?     // total job duration in ms
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Notes

- `ChatMessage` stores conversation history for the demo session
- `WorkerResult` stores CAJ job results posted via callback
- No `userId` -- chat feature has no auth
- `jobId` on `ChatMessage` links to `WorkerResult` for CAJ messages
