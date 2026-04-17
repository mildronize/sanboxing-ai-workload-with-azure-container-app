# Task 8: CAJ Worker Container Rewrite

## Objective

Replace the M1 OpenCode-based worker with a minimal Python container. The container receives `CODE` env var, executes it with Python, captures stdout, and POSTs the result back to `CALLBACK_URL`.

## Scope

- Rewrite `worker/Dockerfile` to use a minimal Python image
- Replace `worker/entrypoint.sh` with a simple Python script
- Remove `worker/server.ts` (no longer needed -- session path uses PythonLTS, not custom container)
- Remove `worker/opencode-config/` directory

## Files to Modify/Delete

- `worker/Dockerfile` (rewrite)
- `worker/entrypoint.sh` (delete or replace)
- `worker/server.ts` (delete)
- `worker/opencode-config/` (delete)
- `worker/run.py` (new -- Python script)

## Rules & Contracts

- `.chief/_rules/_standard/coding-standards.md` -- worker lives in `worker/`
- `.chief/milestone-2/_goal/goal.md` -- Decision #7 (minimal Python, zero external deps)

**Note**: `coding-standards.md` says "Same image for both CAJ and Dynamic Session modes" -- this is overridden by M2 goal. In M2, the session path uses PythonLTS (managed by Microsoft, no custom image). The worker container is now CAJ-only. The coding standard should be updated after this task.

## Steps

1. Delete `worker/server.ts`, `worker/opencode-config/`
2. Create `worker/run.py`:
   ```python
   import os, sys, subprocess, json
   from urllib.request import Request, urlopen

   code = os.environ.get("CODE", "")
   callback_url = os.environ.get("CALLBACK_URL", "")

   result = subprocess.run(["python", "-c", code], capture_output=True, text=True, timeout=120)
   stdout = result.stdout
   stderr = result.stderr

   payload = json.dumps({"stdout": stdout or stderr}).encode()
   req = Request(callback_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
   urlopen(req)
   ```
3. Rewrite `worker/Dockerfile`:
   - Base image: `python:3.12-slim`
   - Copy `run.py`
   - CMD: `python run.py`
4. Delete or simplify `worker/entrypoint.sh` (no longer needed -- single mode)

## Acceptance Criteria

- Dockerfile builds successfully with `docker build`
- Container only has Python stdlib (zero external deps)
- Reads `CODE` env var, runs it, POSTs stdout (or stderr on failure) to `CALLBACK_URL` as the `stdout` field
- No Node, no Bun, no OpenCode, no npm
- Image is minimal (< 200MB)

## Verification

```bash
docker build -t demo-worker ./worker
```

## Deliverables

- `worker/Dockerfile` (rewritten)
- `worker/run.py` (new)
- Deleted: `worker/server.ts`, `worker/entrypoint.sh`, `worker/opencode-config/`
