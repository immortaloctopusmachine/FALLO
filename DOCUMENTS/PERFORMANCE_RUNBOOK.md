# Performance Runbook

> Updated: 2026-02-19
> Scope: Operational steps for database/index rollout, runtime DB mode, and repeatable performance practices.

## 1) Apply database performance changes (Point 1)

This repo currently uses a `db push` workflow.

### Local / dev database

```powershell
npx prisma validate
npm run db:push
npm run db:generate
```

### Production database

Run the same commands in your production environment (with production env vars loaded):

```powershell
npx prisma validate
npm run db:push
npm run db:generate
```

Then restart the app process so Prisma reconnects with the updated schema metadata.

## 2) Configure DB runtime mode by deployment (Point 2)

The app now supports auto-selecting `DIRECT_URL` in non-serverless runtimes:

- Code: `src/lib/prisma.ts`
- Override flag: `PRISMA_USE_DIRECT_URL`

### Recommended setup

1. Serverless runtime (Vercel/Lambda):
   - Keep `DATABASE_URL` on pooler (`:6543`) with `pgbouncer=true`.
   - Leave `PRISMA_USE_DIRECT_URL` unset or set to `false`.
2. Non-serverless runtime (long-lived Node process, VM, container):
   - Set `DIRECT_URL` (session connection endpoint).
   - Set `PRISMA_USE_DIRECT_URL=true`.

### Example `.env` for non-serverless

```env
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://...pooler...:5432/postgres"
PRISMA_USE_DIRECT_URL="true"
```

### Quick latency check

Use this after deploy to validate round-trip DB latency:

```powershell
@'
const { PrismaClient } = require('@prisma/client');
const { performance } = require('node:perf_hooks');
const prisma = new PrismaClient();
(async () => {
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const t1 = performance.now();
    console.log(`#${i + 1}: ${(t1 - t0).toFixed(2)}ms`);
  }
  await prisma.$disconnect();
})();
'@ | node -
```

## 3) Split patchsets from dirty state (Point 3)

Created patchsets:

- `DOCUMENTS/PATCHSETS/performance-stabilization-2026-02-19.patch`
- `DOCUMENTS/PATCHSETS/nonperf-ui-theme-2026-02-19.patch`

Apply only performance work:

```powershell
git apply DOCUMENTS/PATCHSETS/performance-stabilization-2026-02-19.patch
```

Apply only UI/theme work:

```powershell
git apply DOCUMENTS/PATCHSETS/nonperf-ui-theme-2026-02-19.patch
```

## 4) Ongoing performance best-practice checklist

Use this in PR reviews:

1. API query shape:
   - Prefer `select` over broad `include`.
   - Add explicit lightweight vs full scopes for heavy endpoints.
2. Avoid N+1:
   - Preload once, map in memory.
   - Use `createMany`/batch writes for bulk operations.
3. UI fetch behavior:
   - Avoid `router.refresh()` unless strictly required.
   - Prefer targeted React Query `invalidateQueries`.
4. Background work:
   - Do not block read endpoints with non-critical maintenance jobs.
5. DB indexing:
   - Add indexes for frequent filters + sort columns used together.
6. Auth hot path:
   - Avoid per-request duplicate permission lookups.
7. Verification:
   - Run `npm run type-check`, `npm run lint`, `npm run test`.
   - Capture basic latency and payload comparisons for changed endpoints.

## 5) UI responsiveness patterns now in use

1. Minimal write responses:
   - For create flows that only need an ID, use minimal response mode.
   - Example: `POST /api/boards?response=minimal` returns `{ id }` instead of a full board payload.
2. Cache-first UX after creates:
   - Hydrate the relevant query cache with the new entity immediately.
   - Keep a background `invalidateQueries` call to reconcile server truth.
3. Batch writes:
   - Prefer `createMany` for timeline block/event fan-out operations.
   - Avoid per-row insert loops on hot create paths.
4. Lightweight picker reads:
   - For selection dialogs, use narrow API scopes (example: `/api/teams/:teamId/members?scope=picker`).
   - For project detail pages, use project-shaped payloads (example: `/api/boards/:id?scope=project`).
   - Exclude non-UI-critical relations (skills/history) from picker payloads.
   - Prefer ID-only membership lookups plus in-memory joins when user details are already loaded
     (example: `/api/teams/:teamId/members?scope=ids` + `/api/users?scope=picker`).
5. Predictive view prefetch:
   - Preload heavy board data in idle time after lightweight board payloads render.
   - Prefetch major route tabs (settings subpages) and lazy view bundles on hover/mount.
6. Wheel/scroll UX:
   - If `preventDefault()` is required for wheel gestures, use a native `wheel` listener with
     `{ passive: false }` to avoid console spam and no-op prevention.
