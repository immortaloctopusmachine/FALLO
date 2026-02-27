# Cron Setup Guide

Step-by-step guide for setting up and managing Vercel cron jobs in Fallo.

## Current Cron Jobs

| Endpoint | Schedule | Purpose | Trigger Script |
|----------|----------|---------|----------------|
| `/api/cron/release-staged-tasks` | `0 6 * * *` (daily 6 AM UTC) | Auto-release staged tasks whose release date has arrived | `npm run cron:release:trigger` |
| `/api/cron/slack-project-summaries` | Not in `vercel.json` (manual/future) | Post weekly project summary to Slack channels | `npm run cron:slack:trigger` |

## Adding a New Cron Job

### Step 1: Create the route handler

Create `src/app/api/cron/<name>/route.ts`:

```typescript
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-utils';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  const tokenFromAuth = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  const tokenFromHeader = request.headers.get('x-cron-secret');

  return tokenFromAuth === secret || tokenFromHeader === secret;
}

async function handleCronRequest(request: Request) {
  if (!process.env.CRON_SECRET) {
    return ApiErrors.internal('CRON_SECRET environment variable is not configured');
  }

  if (!isAuthorized(request)) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  try {
    // Your cron logic here
    const result = { processed: 0 };
    return apiSuccess(result);
  } catch (error) {
    console.error('Cron <name> failed:', error);
    return ApiErrors.internal('Failed to process <name>');
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
```

### Step 2: Register in `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/<name>",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### Step 3: Create a trigger script (optional, for manual testing)

Create `scripts/trigger-<name>-cron.mjs`:

```javascript
const baseUrl = process.env.CRON_BASE_URL || 'http://localhost:3800';
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error('Set CRON_SECRET env var');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/cron/<name>`, {
  method: 'GET',
  headers: { Authorization: `Bearer ${secret}` },
});

console.log(`Status: ${res.status}`);
console.log(await res.json());
```

Add to `package.json`:

```json
"cron:<name>:trigger": "node scripts/trigger-<name>-cron.mjs"
```

### Step 4: Deploy

```powershell
vercel --prod
```

Cron schedules are only registered after a production deployment.

## Generating a CRON_SECRET

PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Bash/macOS:

```bash
openssl rand -base64 48
```

Set in Vercel:

```powershell
vercel env add CRON_SECRET production
vercel env add CRON_SECRET preview
```

## Vercel Plan Limits

| Plan | Max Crons | Min Frequency | Max Duration |
|------|-----------|---------------|--------------|
| Hobby | 1 | Daily | 10s |
| Pro | 40 | Per minute | 60s (default), 300s (configurable) |

**Hobby workaround**: If you need multiple cron tasks on Hobby, create a single cron endpoint that dispatches to multiple handlers based on day-of-week or other logic.

## Testing Crons

### Locally

```powershell
$env:CRON_SECRET="test-secret-for-local"
# Start dev server
npm run dev
# In another terminal
$env:CRON_BASE_URL="http://localhost:3800"
$env:CRON_SECRET="test-secret-for-local"
npm run cron:release:trigger
```

### Against Vercel deployment

```powershell
$env:CRON_BASE_URL="https://fallo-vercel.vercel.app"
$env:CRON_SECRET="<your-production-secret>"
npm run cron:release:trigger
```

Expected response:

```json
{ "success": true, "data": { "scanned": 5, "due": 2, "released": 2 } }
```

## Security Notes

- Cron endpoints reject all requests without a valid `CRON_SECRET`.
- Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` for scheduled invocations.
- If a deployment-protection bypass token was shared during setup, rotate it: **Project Settings > Deployment Protection > Protection Bypass for Automation**.
