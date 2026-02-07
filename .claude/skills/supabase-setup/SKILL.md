---
name: supabase-setup
description: Complete guide for Supabase implementation and setup in web applications. Use when: (1) Setting up Supabase in a new project, (2) Configuring authentication (email, OAuth, magic links), (3) Creating database tables and RLS policies, (4) Setting up real-time subscriptions, (5) Troubleshooting Supabase connection or auth issues, (6) Migrating from other databases to Supabase.
---

# Supabase Setup Skill

Comprehensive guide for implementing Supabase in web applications, covering database setup, authentication, real-time features, and common troubleshooting.

## Quick Start Checklist

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Install dependencies
3. Configure environment variables
4. Initialize Supabase client
5. Set up authentication (if needed)
6. Create database schema
7. Configure Row Level Security (RLS)
8. Test connection

## Installation

### Next.js / React

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### For Auth Helpers (Next.js App Router)

```bash
npm install @supabase/ssr
```

## Environment Variables

Create `.env.local` (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Finding your keys:**
1. Go to Supabase Dashboard > Project Settings > API
2. `URL` = Project URL
3. `anon/public` = ANON_KEY (safe for client-side)
4. `service_role` = SERVICE_ROLE_KEY (server-side only, bypasses RLS)

## Client Setup

### Browser Client (for client components)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server Client (for server components, route handlers, server actions)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
```

### Admin Client (bypasses RLS - server-side only)

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

## Middleware Setup (Required for Auth)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Authentication

### Sign Up with Email

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
  },
})
```

### Sign In with Email

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
```

### OAuth (Google, GitHub, etc.)

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
})
```

### Auth Callback Route

```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
```

### Get Current User

```typescript
// Server-side
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

// Client-side
const { data: { user } } = await supabase.auth.getUser()
```

### Sign Out

```typescript
await supabase.auth.signOut()
```

## Database Operations

### Select

```typescript
const { data, error } = await supabase
  .from('posts')
  .select('*')

// With relationships
const { data, error } = await supabase
  .from('posts')
  .select(`
    id,
    title,
    author:users(name, email)
  `)

// With filters
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(10)
```

### Insert

```typescript
const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'New Post', content: 'Content here' })
  .select()
  .single()
```

### Update

```typescript
const { data, error } = await supabase
  .from('posts')
  .update({ title: 'Updated Title' })
  .eq('id', postId)
  .select()
  .single()
```

### Delete

```typescript
const { error } = await supabase
  .from('posts')
  .delete()
  .eq('id', postId)
```

### Upsert

```typescript
const { data, error } = await supabase
  .from('posts')
  .upsert({ id: postId, title: 'Upserted Post' })
  .select()
```

## Row Level Security (RLS)

**Always enable RLS on tables with user data.**

### Enable RLS

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### Common Policies

```sql
-- Users can read all posts
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

-- Users can only insert their own posts
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (auth.uid() = user_id);
```

### Service Role Bypasses RLS

The service role key bypasses RLS - use only on server-side for admin operations.

## Real-time Subscriptions

```typescript
const channel = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // 'INSERT' | 'UPDATE' | 'DELETE'
      schema: 'public',
      table: 'posts',
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Cleanup
channel.unsubscribe()
```

### Enable Realtime on Table

In Supabase Dashboard: Database > Replication > Enable for specific tables

Or via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
```

## TypeScript Types Generation

```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
```

Usage:
```typescript
import { Database } from '@/types/database.types'

const supabase = createClient<Database>(url, key)
```

## References

For detailed troubleshooting and advanced patterns, see:
- `references/troubleshooting.md` - Common issues and solutions
- `references/auth-patterns.md` - Advanced authentication patterns
- `references/rls-patterns.md` - Row Level Security patterns and examples
