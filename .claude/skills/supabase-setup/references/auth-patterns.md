# Supabase Authentication Patterns

## Provider Configuration

### Google OAuth

1. **Google Cloud Console Setup:**
   - Create project at console.cloud.google.com
   - Enable Google+ API
   - Create OAuth 2.0 credentials (Web application)
   - Authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - Authentication > Providers > Google
   - Add Client ID and Client Secret

3. **Code:**
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`,
       queryParams: {
         access_type: 'offline',
         prompt: 'consent',
       },
     },
   })
   ```

### GitHub OAuth

1. **GitHub Setup:**
   - Settings > Developer settings > OAuth Apps
   - Authorization callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - Authentication > Providers > GitHub
   - Add Client ID and Client Secret

3. **Code:**
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'github',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`,
     },
   })
   ```

### Magic Link (Passwordless)

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

## Protected Routes

### Server Component Protection

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <div>Welcome, {user.email}</div>
}
```

### Client Component Protection

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ProtectedPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  return <div>Protected content</div>
}
```

### Middleware-Based Protection

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/settings', '/profile']
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Redirect unauthenticated users from protected routes
  if (protectedRoutes.some(route => path.startsWith(route)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users from auth routes
  if (authRoutes.some(route => path.startsWith(route)) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}
```

## Auth State Listener

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AuthListener({ children }) {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          router.refresh()
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
          router.refresh()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return children
}
```

## User Metadata

### Setting User Metadata on Signup

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  },
})
```

### Updating User Metadata

```typescript
const { data, error } = await supabase.auth.updateUser({
  data: {
    full_name: 'Jane Doe',
  },
})
```

### Accessing Metadata

```typescript
const { data: { user } } = await supabase.auth.getUser()
const fullName = user?.user_metadata?.full_name
```

## Profile Table Pattern

### Create Profile on Signup (Database Trigger)

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Sync Profile with Auth Metadata

```sql
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    full_name = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata();
```

## Session Management

### Get Session

```typescript
// Server-side - use getUser() for security
const { data: { user } } = await supabase.auth.getUser()

// Client-side - getSession() is faster but less secure
const { data: { session } } = await supabase.auth.getSession()
```

### Refresh Session

```typescript
const { data, error } = await supabase.auth.refreshSession()
```

### Session in API Routes

```typescript
// app/api/protected/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Protected logic here
  return NextResponse.json({ data: 'protected data' })
}
```

## Password Management

### Password Reset Flow

1. Request reset email:
   ```typescript
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${origin}/auth/reset-password`,
   })
   ```

2. Handle callback and update password:
   ```typescript
   // On /auth/reset-password page
   const { error } = await supabase.auth.updateUser({
     password: newPassword,
   })
   ```

### Change Password (Logged In)

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword,
})
```

## Multi-Factor Authentication (MFA)

### Enable TOTP

```typescript
// Enroll
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
})

// data.totp.qr_code - Show this QR code to user
// data.totp.secret - Backup code

// Verify enrollment
const { error } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challengeId,
  code: userEnteredCode,
})
```

### Challenge on Login

```typescript
const { data: { user }, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (user?.factors?.length > 0) {
  // User has MFA enabled, need to verify
  const { data: challenge } = await supabase.auth.mfa.challenge({
    factorId: user.factors[0].id,
  })

  // Prompt user for TOTP code
  const { error } = await supabase.auth.mfa.verify({
    factorId: user.factors[0].id,
    challengeId: challenge.id,
    code: userCode,
  })
}
```
