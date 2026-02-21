'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/home';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSlackLoading, setIsSlackLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const authRequireSlack = process.env.NEXT_PUBLIC_AUTH_REQUIRE_SLACK === 'true';
  const slackAuthEnabled = process.env.NEXT_PUBLIC_SLACK_AUTH_ENABLED === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError('Invalid email or password');
        setIsLoading(false);
      } else {
        setIsRedirecting(true);
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setLoginError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSlackSignIn = async () => {
    setIsSlackLoading(true);
    setLoginError(null);
    await signIn('slack', { callbackUrl });
    setIsSlackLoading(false);
  };

  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <span className="text-2xl font-bold text-text-secondary">Fallo</span>
          <div className="themed-loader-dots flex items-center gap-1.5">
            <span className="themed-loader-dot" />
            <span className="themed-loader-dot" />
            <span className="themed-loader-dot" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(error || loginError) && (
        <div className="rounded-md bg-error/10 p-3 text-sm text-error">
          {loginError || 'Authentication failed. Please try again. If using Slack, ask an admin to link your Slack profile first.'}
        </div>
      )}

      {slackAuthEnabled && (
        <Button
          type="button"
          className="w-full"
          onClick={() => void handleSlackSignIn()}
          disabled={isSlackLoading}
        >
          {isSlackLoading ? 'Redirecting to Slack...' : 'Sign in with Slack'}
        </Button>
      )}

      {!authRequireSlack && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {slackAuthEnabled && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-caption text-text-tertiary">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in with Email'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-display">Fallo</h1>
          <p className="text-text-secondary">Sign in to your account</p>
        </div>

        <Suspense fallback={<div className="h-[200px] animate-pulse rounded-md bg-surface" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-caption text-text-tertiary">
          Don&apos;t have an account? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
