# Vercel Deployment Troubleshooting

Common issues encountered when deploying Fallo to Vercel, with solutions.

## Build Failures

### "Cannot find module '@prisma/client'"

**Cause**: Prisma client not generated before build.

**Fix**: The build script already handles this (`"build": "prisma generate && next build"`). If it still fails:
- Verify `prisma` is in `devDependencies` and `@prisma/client` is in `dependencies`.
- Check that `"postinstall": "prisma generate"` exists in `package.json`.
- Ensure `prisma/schema.prisma` is committed.

### TypeScript compilation errors

**Cause**: Type errors that don't appear locally due to different TS strictness or missing env types.

**Fix**: Run `npm run type-check` locally before deploying. Common culprits:
- Missing `@types/*` packages in `devDependencies`.
- Files importing from paths that only resolve with local `tsconfig` aliases — ensure `@/` paths match the `paths` config.

### "Error: ENOENT: no such file or directory, open '.next/...'"

**Cause**: Stale build cache on Vercel.

**Fix**: Redeploy with clean cache:
```powershell
vercel --prod --force
```

## Database Connection Errors

### "Can't reach database server" or "Connection timed out"

**Cause**: Wrong connection string or missing pooler config.

**Checklist**:
1. `DATABASE_URL` must use **port 6543** (transaction pooler), not 5432.
2. URL must include `?pgbouncer=true&connection_limit=10`.
3. `PRISMA_USE_DIRECT_URL` must be `"false"` or unset.
4. Verify Supabase project is not paused (Hobby projects pause after 1 week of inactivity).

### "prepared statement already exists" or pgbouncer errors

**Cause**: Prisma's prepared statements conflict with pgbouncer in transaction mode.

**Fix**: Ensure `?pgbouncer=true` is in the `DATABASE_URL`. This tells Prisma to disable prepared statements.

### "Too many connections"

**Cause**: Serverless cold starts each open a new connection.

**Fix**:
- Keep `connection_limit=10` in the URL.
- Ensure you're using the Supabase transaction pooler (port 6543).
- Check Supabase dashboard for connection count — Hobby plan allows ~20 direct connections.

## Cron Jobs

### Cron not firing

**Checklist**:
1. `vercel.json` has the cron entry with correct path and schedule.
2. Deployed to **production** (crons only run on production deployments).
3. `CRON_SECRET` is set in the production environment.
4. Hobby plan: only 1 cron allowed, daily frequency only.
5. Check Vercel dashboard: **Project > Settings > Crons** to see registered schedules.

### Cron returns 401 Unauthorized

**Cause**: `CRON_SECRET` mismatch between Vercel env and the route handler.

**Fix**:
- Run `vercel env ls` to verify `CRON_SECRET` is set for production.
- Redeploy after changing env vars: `vercel --prod`.
- Test manually: `npm run cron:release:trigger` with the correct secret.

### Cron returns 504 Gateway Timeout

**Cause**: Function exceeds timeout (10s on Hobby, 60s on Pro).

**Fix**:
- Optimize the cron handler to do less work per invocation.
- Use pagination/batching for large datasets.
- On Pro plan, increase function timeout in `vercel.json`:
  ```json
  { "functions": { "src/app/api/cron/**/*.ts": { "maxDuration": 120 } } }
  ```

## Function Errors

### "FUNCTION_INVOCATION_TIMEOUT"

**Cause**: API route exceeds max duration.

**Fix**:
- Hobby: 10s limit. Optimize Prisma queries — use `select` over `include`, avoid N+1.
- Pro: Increase per-route: `"functions": { "src/app/api/**/*.ts": { "maxDuration": 30 } }` in `vercel.json`.

### "EDGE_FUNCTION_INVOCATION_FAILED"

**Cause**: Route is running on Edge runtime but uses Node.js-only APIs (Prisma, bcrypt, etc.).

**Fix**: Ensure all API routes and cron handlers use Node.js runtime:
```typescript
export const runtime = 'nodejs';
```

### Cold start latency

**Symptom**: First request after idle is slow (3-5s).

**Mitigation**:
- Keep function bundles small — avoid importing entire libraries when you only need one function.
- Prisma client instantiation is cached in `src/lib/prisma.ts` (singleton pattern).
- On Pro plan, enable "Fluid Compute" for faster cold starts.

## Deployment Protection

### Preview deployments return 401/403

**Cause**: Vercel deployment protection is enabled.

**Fix**:
- For automated testing, create a bypass token: **Project Settings > Deployment Protection > Protection Bypass for Automation**.
- Pass the token as `x-vercel-protection-bypass` header or `?x-vercel-protection-bypass=<token>` query param.
- Rotate the bypass token after sharing it in any chat or log.

## Image Optimization

### Remote images return 400 Bad Request

**Cause**: Image hostname not in `next.config.ts` `remotePatterns`.

**Fix**: Add the hostname to the `remotePatterns` array in `next.config.ts`. Current allowed hosts:
- `avatars.githubusercontent.com` (GitHub)
- `lh3.googleusercontent.com` (Google)
- `avatars.slack-edge.com` (Slack)
- `secure.gravatar.com` (Gravatar)
- `a.slack-edge.com` (Slack CDN)
- Dynamic: `R2_PUBLIC_URL` hostname (if set)

## Useful Commands

```powershell
# View deployment logs
vercel logs <deployment-url>

# List recent deployments
vercel ls

# Inspect a deployment
vercel inspect <deployment-url>

# View env vars
vercel env ls

# Pull env vars to local file
vercel env pull .env.local

# Force redeploy with clean cache
vercel --prod --force

# Promote a preview deployment to production
vercel promote <deployment-url>
```
