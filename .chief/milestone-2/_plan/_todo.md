# TODO List for Milestone 2

## Batch 1: Foundation (Schema + Clients)

- [x] task-1: Prisma schema changes (add code/stdout to ChatMessage, rename WorkerResult.result to stdout)
- [x] task-2: Azure OpenAI client + execute_python tool definition
- [x] task-3: PythonLTS session execution client (rewrite sendToSession for /executions API)

## Batch 2: Backend Logic (Service + Routes)

- [ ] task-4: Agent loop + chat service rewrite (session path)
- [ ] task-5: Chat service rewrite (CAJ path) + CAJ trigger update
- [ ] task-6: Chat routes + API response shape update + callback handler (includes former task-10)

## Batch 3: Frontend + Worker + Terraform

- [ ] task-7: Frontend -- code + stdout display blocks, conversationId
- [ ] task-8: CAJ worker container rewrite (minimal Python, CAJ-only)
- [ ] task-9: Terraform -- PythonLTS session pool + CAJ env var cleanup

## Batch 4: Verification

- [ ] task-11: End-to-end type check + build verification
