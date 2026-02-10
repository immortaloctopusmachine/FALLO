import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
  // GitHub avatars (OAuth)
  {
    protocol: 'https',
    hostname: 'avatars.githubusercontent.com',
  },
  // Google avatars (OAuth)
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
  },
  // Slack profile avatars
  {
    protocol: 'https',
    hostname: 'avatars.slack-edge.com',
  },
  // Slack default avatar redirects sometimes use Gravatar
  {
    protocol: 'https',
    hostname: 'secure.gravatar.com',
  },
  // Slack CDN fallback avatar host
  {
    protocol: 'https',
    hostname: 'a.slack-edge.com',
  },
];

// Add Cloudflare R2 public URL if configured
if (process.env.R2_PUBLIC_URL) {
  try {
    const { hostname } = new URL(process.env.R2_PUBLIC_URL);
    remotePatterns.push({
      protocol: 'https',
      hostname,
    });
  } catch {
    // Invalid URL, skip
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
