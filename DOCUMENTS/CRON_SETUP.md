# Cron Setup: Staged Task Release

Created: 2026-02-07

## Purpose

Configure automatic release of staged tasks via:

- endpoint: `/api/cron/release-staged-tasks`
- schedule: hourly (`0 * * * *`) from `vercel.json`

## Prerequisites

1. Vercel CLI installed.
2. Access to the target Vercel project.
3. This repository linked to that project.

## 1) Link this repo to Vercel project

Run in repo root:

```powershell
vercel link
```

Follow prompts to choose team and project.

## 2) Generate a strong cron secret

PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy the generated value.

## 3) Set `CRON_SECRET` in Vercel environments

Add for Production:

```powershell
vercel env add CRON_SECRET production
```

Add for Preview:

```powershell
vercel env add CRON_SECRET preview
```

Add for Development (optional):

```powershell
vercel env add CRON_SECRET development
```

## 4) Redeploy

Deploy so runtime sees new env vars:

```powershell
vercel --prod
```

## 5) Verify endpoint manually

Set base URL and secret, then trigger:

```powershell
$env:CRON_BASE_URL="https://<your-deployment-domain>"
$env:CRON_SECRET="<your-secret>"
npm run cron:release:trigger
```

Expected:
- HTTP 200
- `success: true`
- response counters (`scanned`, `due`, `released`, etc.)

## Notes

- Endpoint rejects requests without valid secret.
- Lazy fallback also runs on board fetch (`GET /api/boards/[boardId]`) if cron is delayed.
