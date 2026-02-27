# Environment Variables for Vercel

Complete list of env vars the app uses, with Vercel-specific guidance.

## Required

| Variable | Environments | Value Guidance |
|----------|-------------|----------------|
| `DATABASE_URL` | prod, preview, dev | Supabase transaction pooler. **Must use port 6543** with `?pgbouncer=true&connection_limit=10` for serverless. |
| `DIRECT_URL` | prod, preview, dev | Supabase session pooler on port 5432. Used by Prisma CLI for migrations only — not used at runtime on Vercel. |
| `NEXTAUTH_URL` | prod, preview | Production: `https://your-domain.vercel.app`. Preview: can leave unset (NextAuth auto-detects on Vercel). |
| `NEXTAUTH_SECRET` | prod, preview, dev | Generate: `openssl rand -base64 32`. Same value across environments for session compatibility. |
| `CRON_SECRET` | prod, preview | Bearer token for cron endpoint auth. Generate: `[Convert]::ToBase64String((1..48 \| ForEach-Object { Get-Random -Maximum 256 }))` (PowerShell) or `openssl rand -base64 48`. |

## Optional — OAuth Providers

| Variable | Environments | Notes |
|----------|-------------|-------|
| `GITHUB_CLIENT_ID` | prod, preview | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | prod, preview | GitHub OAuth app secret |
| `GOOGLE_CLIENT_ID` | prod, preview | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | prod, preview | Google OAuth secret |
| `SLACK_CLIENT_ID` | prod, preview | Slack OAuth app client ID |
| `SLACK_CLIENT_SECRET` | prod, preview | Slack OAuth app secret |

## Optional — Integrations

| Variable | Environments | Notes |
|----------|-------------|-------|
| `ANTHROPIC_API_KEY` | prod | Claude API key for LLM features |
| `SLACK_BOT_TOKEN` | prod | Slack bot token (`xoxb-...`) for project summary cron. Required scopes: `users:read`, `channels:read`, `groups:read`, `chat:write` |
| `AUTH_REQUIRE_SLACK` | prod | `"true"` to require Slack SSO |
| `NEXT_PUBLIC_SLACK_AUTH_ENABLED` | prod | `"true"` to show Slack login button |
| `NEXT_PUBLIC_AUTH_REQUIRE_SLACK` | prod | `"true"` to hide credentials form |

## Optional — File Storage (Cloudflare R2)

| Variable | Environments | Notes |
|----------|-------------|-------|
| `R2_ACCOUNT_ID` | prod | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | prod | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | prod | R2 API token secret |
| `R2_BUCKET_NAME` | prod | R2 bucket name |
| `R2_PUBLIC_URL` | prod | Public URL for the R2 bucket (used in `next.config.ts` image remote patterns) |

## Runtime Configuration

| Variable | Environments | Notes |
|----------|-------------|-------|
| `PRISMA_USE_DIRECT_URL` | prod | **Must be `"false"` or unset on Vercel.** Only set `"true"` for non-serverless (VM/container) deployments. |
| `NODE_ENV` | (auto) | Vercel sets this automatically — do not override. |

## Setting Variables via CLI

```powershell
# Add a variable (interactive — prompts for value)
vercel env add VARIABLE_NAME production

# Add for multiple environments
vercel env add VARIABLE_NAME production preview development

# List all variables
vercel env ls

# Pull variables to local .env.local (for local dev matching Vercel config)
vercel env pull .env.local

# Remove a variable
vercel env rm VARIABLE_NAME production
```

## Preview Environment Notes

- Preview deployments use their own env scope. Set at least `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, and `CRON_SECRET` for preview.
- `NEXTAUTH_URL` can be omitted for preview — NextAuth auto-detects the URL on Vercel.
- Consider using a separate database for preview to avoid polluting production data.
