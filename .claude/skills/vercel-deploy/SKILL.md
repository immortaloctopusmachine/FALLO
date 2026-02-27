---
name: vercel-deploy
description: Guide for deploying and managing Fallo on Vercel (Hobby or Pro). Use when: (1) Setting up a new Vercel project from scratch, (2) Configuring environment variables for Vercel, (3) Adding or modifying cron jobs, (4) Debugging deployment or build failures, (5) Managing database connections in serverless, (6) Deploying to production or preview, (7) Troubleshooting Vercel-specific issues.
---

# Vercel Deploy Skill

Operational guide for deploying and managing the Fallo Next.js app on Vercel. Derived from the project's actual setup, config files, and deployment history.

## Quick Reference

| Item | Value |
|------|-------|
| Vercel project | `fallo-vercel` |
| Framework | Next.js 15 (auto-detected) |
| Build command | `prisma generate && next build` |
| Output dir | `.next` (production), `.next-dev` (dev only) |
| Node runtime | `nodejs` (set per-route where needed) |
| Plan constraints | Hobby: 1 cron (daily only), 100 GB bandwidth, 10s function timeout |

## Initial Setup

### 1. Install Vercel CLI

```powershell
npm i -g vercel
```

### 2. Link repository to Vercel project

```powershell
vercel link
```

Follow prompts to select team and project. This creates `.vercel/project.json` (gitignored).

### 3. Set environment variables

Required env vars for Vercel (set for `production`, `preview`, and optionally `development`):

```powershell
# Database (Supabase pooler - MUST use port 6543 for serverless)
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Auth
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production

# Cron security
vercel env add CRON_SECRET production
vercel env add CRON_SECRET preview

# OAuth providers (if used)
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production

# Repeat for preview/development as needed
```

See `references/env-vars.md` for the full variable list and value guidance.

### 4. Deploy

```powershell
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## Database Connection for Serverless

Serverless functions open/close DB connections per invocation. **Connection pooling is mandatory.**

```env
# Runtime (serverless): Transaction pooler on port 6543
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

# Migrations only: Session pooler on port 5432
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-1-[REGION].pooler.supabase.com:5432/postgres"

# MUST be false for Vercel (serverless)
PRISMA_USE_DIRECT_URL="false"
```

The app's `src/lib/prisma.ts` auto-selects the correct URL based on `PRISMA_USE_DIRECT_URL`.

## Cron Jobs

### Current crons (defined in `vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/release-staged-tasks",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### Adding a new cron

1. Create the route handler at `src/app/api/cron/<name>/route.ts`.
2. Use the standard auth pattern (copy from existing cron routes):
   - Check `CRON_SECRET` env var exists.
   - Validate `Authorization: Bearer <secret>` or `x-cron-secret` header.
   - Export both `GET` and `POST` handlers.
   - Set `export const runtime = 'nodejs';`.
3. Add the cron entry to `vercel.json`:
   ```json
   { "path": "/api/cron/<name>", "schedule": "<cron expression>" }
   ```
4. **Hobby plan limit**: 1 cron job, daily frequency only (`0 H * * *`). Pro plan allows up to 40 crons with per-minute granularity.
5. Deploy with `vercel --prod` so the cron schedule is registered.

### Testing crons locally

```powershell
$env:CRON_SECRET="<your-secret>"
$env:CRON_BASE_URL="https://<deployment-domain>"
npm run cron:release:trigger
npm run cron:slack:trigger
```

See `references/cron-setup.md` for the full setup walkthrough.

## Build Configuration

### `next.config.ts` (Vercel-relevant settings)

- **Separate build dirs**: `.next` (prod) vs `.next-dev` (dev) to prevent chunk corruption.
- **Image remote patterns**: GitHub, Google, Slack, Gravatar avatars + optional Cloudflare R2.
- No Vercel-specific plugins needed — Next.js on Vercel is zero-config.

### `package.json` build script

```
"build": "prisma generate && next build"
```

`prisma generate` runs before `next build` to ensure the Prisma client is available in serverless bundles. Also runs via `"postinstall": "prisma generate"` as a safety net.

## Deployment Checklist

1. Verify env vars are set: `vercel env ls`
2. Ensure `vercel.json` crons are correct
3. Run locally: `npm run build` (catches type/build errors before deploy)
4. Deploy: `vercel --prod`
5. Verify cron endpoint: `npm run cron:release:trigger`
6. Check function logs: `vercel logs <deployment-url>`

## Troubleshooting

For common issues (build failures, DB connection errors, cron not firing, function timeouts), see `references/troubleshooting.md`.

## References

- `references/env-vars.md` - Complete environment variable reference
- `references/cron-setup.md` - Step-by-step cron setup with secret generation
- `references/troubleshooting.md` - Common deployment issues and fixes
