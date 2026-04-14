# New Module Checklist

When adding a new backend module:

1. Create `server/modules/<name>/` with these files:
   - `<name>.repository.ts` -- interface + Prisma implementation
   - `<name>.service.ts` -- business logic
   - `<name>.routes.ts` -- Elysia route plugin factory
   - `<name>.errors.ts` -- domain-specific errors
   - `index.ts` -- barrel export

2. Add Prisma model to `prisma/schema.prisma`

3. Run `bun run db:generate` to regenerate client + prismabox

4. Register in `server/context/app-context.ts`:
   - Add service to `ServiceContainer` interface
   - Wire in `createContainer()`

5. Mount in `server/index.ts`:
   - `.use(create<Name>Routes(container))`

When adding a new frontend feature:

1. Create `app/features/<name>/` with:
   - `components/` -- React components
   - `hooks/` -- React Query + Eden hooks
   - `index.ts` -- barrel export

2. Import in route file: `app/routes/<path>.tsx`
