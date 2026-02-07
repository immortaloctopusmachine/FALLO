# Supabase Troubleshooting Guide

## Connection Issues

### "Failed to fetch" or CORS Errors

**Symptoms:**
- Network requests fail with CORS errors
- "Failed to fetch" in browser console

**Causes & Solutions:**

1. **Wrong URL format**
   - Ensure URL is `https://your-project-ref.supabase.co` (no trailing slash)
   - Check for typos in project reference

2. **Environment variables not loaded**
   - Restart dev server after adding `.env.local`
   - Ensure `NEXT_PUBLIC_` prefix for client-side variables
   - Check `.env.local` is in project root (not src/)

3. **Project paused**
   - Free tier projects pause after 1 week inactivity
   - Go to Supabase Dashboard and unpause

### "Invalid API Key" or 401 Unauthorized

**Solutions:**

1. Copy keys directly from Dashboard (Settings > API)
2. Don't confuse `anon` key with `service_role` key
3. Check for whitespace in `.env.local` values
4. Ensure quotes are correct (no smart quotes from copy-paste)

### "relation does not exist"

**Causes:**

1. Table hasn't been created yet
2. Wrong schema (using `public` vs custom schema)
3. Case sensitivity - Supabase lowercases table names

**Solution:** Run migrations or create table in Dashboard

## Authentication Issues

### Session Not Persisting

**Symptoms:**
- User logged out on page refresh
- `getUser()` returns null after login

**Solutions:**

1. **Middleware not configured**
   - Add middleware.ts (see SKILL.md)
   - Ensure middleware matcher includes your routes

2. **Cookies not being set**
   - Check browser dev tools > Application > Cookies
   - Ensure `setAll` in cookie handler doesn't throw

3. **Using wrong client**
   - Server components: use `createClient` from server.ts
   - Client components: use `createClient` from client.ts
   - Don't use browser client on server

### OAuth Redirect Issues

**"Unable to exchange code for session"**

1. **Missing callback route**
   - Create `/app/auth/callback/route.ts`
   - Handle code exchange

2. **Wrong redirect URL**
   - In Supabase Dashboard: Authentication > URL Configuration
   - Add all redirect URLs (localhost AND production)
   - Format: `http://localhost:3000/auth/callback`

3. **Provider not configured**
   - Dashboard > Authentication > Providers
   - Enable provider (Google, GitHub, etc.)
   - Add OAuth credentials

### Email Confirmation Not Working

**Development:**
- Check Supabase Dashboard > Authentication > Users
- Click "Send verification email" manually
- Or disable email confirmation: Dashboard > Authentication > Email Templates

**Production:**
- Configure custom SMTP: Dashboard > Project Settings > Auth
- Check spam folder
- Verify email template is correct

### "Invalid login credentials"

1. User doesn't exist - check Dashboard > Authentication > Users
2. Wrong password
3. Email not confirmed (if required)
4. User is banned

## Database Issues

### RLS Blocking All Queries

**Symptoms:**
- Queries return empty arrays
- Works with service_role key but not anon key

**Debug steps:**

1. Check if RLS is enabled:
   ```sql
   SELECT relname, relrowsecurity
   FROM pg_class
   WHERE relname = 'your_table';
   ```

2. List policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

3. Test policy with current user:
   ```sql
   SELECT auth.uid(); -- Should return user ID
   ```

**Common fixes:**

1. Policy references wrong column (e.g., `user_id` vs `author_id`)
2. `auth.uid()` is null - user not authenticated
3. Missing policy for operation type (SELECT, INSERT, UPDATE, DELETE)

### Foreign Key Constraint Violations

**When inserting:**
- Referenced row doesn't exist
- Order of operations wrong

**Solution:**
```typescript
// Insert parent first, then child
const { data: user } = await supabase
  .from('users')
  .insert({ name: 'John' })
  .select()
  .single()

const { data: post } = await supabase
  .from('posts')
  .insert({ title: 'Post', user_id: user.id })
  .select()
  .single()
```

### Realtime Not Working

1. **Table not enabled for realtime**
   - Dashboard > Database > Replication
   - Or: `ALTER PUBLICATION supabase_realtime ADD TABLE your_table;`

2. **RLS blocking subscription**
   - Realtime respects RLS policies
   - User must be authenticated for user-specific data

3. **Channel not subscribed**
   ```typescript
   // Must call .subscribe()
   const channel = supabase
     .channel('changes')
     .on('postgres_changes', {...}, callback)
     .subscribe((status) => {
       console.log('Subscription status:', status)
     })
   ```

4. **Cleanup on unmount**
   ```typescript
   useEffect(() => {
     const channel = supabase.channel('...')
     // ...
     return () => {
       channel.unsubscribe()
     }
   }, [])
   ```

## Type Generation Issues

### "supabase" Command Not Found

```bash
# Install CLI globally
npm install -g supabase

# Or use npx
npx supabase gen types typescript --project-id xxx
```

### Types Out of Sync

Regenerate after schema changes:
```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
```

### Using Generated Types

```typescript
import { Database } from '@/types/database.types'

type Post = Database['public']['Tables']['posts']['Row']
type InsertPost = Database['public']['Tables']['posts']['Insert']
type UpdatePost = Database['public']['Tables']['posts']['Update']
```

## Performance Issues

### Slow Queries

1. Add indexes:
   ```sql
   CREATE INDEX idx_posts_user_id ON posts(user_id);
   CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
   ```

2. Use pagination:
   ```typescript
   const { data } = await supabase
     .from('posts')
     .select('*')
     .range(0, 9) // First 10 items
   ```

3. Select only needed columns:
   ```typescript
   // Instead of select('*')
   .select('id, title, created_at')
   ```

### Too Many Requests

1. Implement caching (React Query, SWR)
2. Debounce search/filter operations
3. Use realtime instead of polling

## Migration Issues

### Applying Migrations

```bash
# Push local schema to remote
npx supabase db push

# Generate migration from diff
npx supabase db diff -f migration_name

# Apply migrations
npx supabase db reset
```

### Rollback

Supabase doesn't have automatic rollback. Create a down migration manually:
```sql
-- migrations/20240101_rollback_feature.sql
DROP TABLE IF EXISTS new_feature;
ALTER TABLE posts DROP COLUMN IF EXISTS new_column;
```

## Environment-Specific Issues

### Different Behavior in Production

1. Check environment variables are set in deployment platform
2. Verify production URL is in allowed redirect URLs
3. Check RLS policies work with production user IDs
4. Ensure service_role key is only used server-side

### Local Development with Production DB

Not recommended. Use local Supabase instead:
```bash
npx supabase start
# Uses local Docker containers
```

## Debug Techniques

### Log All Queries (Development Only)

```typescript
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app' },
  },
})
```

### Check Raw Response

```typescript
const response = await supabase.from('posts').select('*')
console.log('Full response:', response)
// { data, error, count, status, statusText }
```

### Supabase Dashboard SQL Editor

Run queries directly to debug:
```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Test RLS policy
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM posts;
```
