# Definition of Done

## For App Code Tasks

All of the following must pass:

```bash
bunx tsc --noEmit        # Type check
bun run test             # Unit tests
bun run build            # Frontend build
```

## For Worker Container Tasks

```bash
docker build -t demo-worker ./worker   # Docker build succeeds
```

## For Terraform Tasks

```bash
cd terraform && terraform validate       # Terraform validates
cd terraform && terraform fmt -check    # Formatting correct
```

## For GitHub Actions Tasks

- Workflow YAML is valid (no syntax errors)
- References correct secrets and variables

## General

- No `console.log` in committed code (use logger)
- No hardcoded secrets (use env vars)
- Path aliases used (no deep relative imports)
- New files follow existing patterns in the codebase
