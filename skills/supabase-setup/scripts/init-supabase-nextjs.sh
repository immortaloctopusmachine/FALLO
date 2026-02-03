#!/bin/bash

# Supabase Next.js Initialization Script
# Usage: ./init-supabase-nextjs.sh [project-dir]

set -e

PROJECT_DIR="${1:-.}"

echo "Initializing Supabase for Next.js project in $PROJECT_DIR"

# Check if we're in a Next.js project
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "Error: package.json not found in $PROJECT_DIR"
  echo "Please run this script from a Next.js project directory"
  exit 1
fi

cd "$PROJECT_DIR"

# Install dependencies
echo "Installing Supabase packages..."
npm install @supabase/supabase-js @supabase/ssr

# Create lib/supabase directory
mkdir -p src/lib/supabase

# Create browser client
cat > src/lib/supabase/client.ts << 'EOF'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
EOF

# Create server client
cat > src/lib/supabase/server.ts << 'EOF'
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
            // Called from Server Component
          }
        },
      },
    }
  )
}
EOF

# Create admin client
cat > src/lib/supabase/admin.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

// WARNING: Only use this on the server side
// Service role key bypasses Row Level Security
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
EOF

# Create middleware
cat > src/middleware.ts << 'EOF'
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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
EOF

# Create auth callback route
mkdir -p src/app/auth/callback
cat > src/app/auth/callback/route.ts << 'EOF'
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
EOF

# Create .env.local template
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
# Supabase Configuration
# Get these values from: https://supabase.com/dashboard/project/_/settings/api

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
  echo "Created .env.local template - please update with your Supabase credentials"
else
  echo ".env.local already exists - please add Supabase variables manually if needed"
fi

# Add to .gitignore if not present
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
  echo ".env.local" >> .gitignore
fi

echo ""
echo "Supabase setup complete!"
echo ""
echo "Created files:"
echo "  - src/lib/supabase/client.ts (browser client)"
echo "  - src/lib/supabase/server.ts (server client)"
echo "  - src/lib/supabase/admin.ts (admin client - server only)"
echo "  - src/middleware.ts (session refresh)"
echo "  - src/app/auth/callback/route.ts (OAuth callback)"
echo "  - .env.local (template)"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your Supabase credentials"
echo "  2. Configure authentication providers in Supabase Dashboard"
echo "  3. Add redirect URLs to Supabase: http://localhost:3000/auth/callback"
