import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Slack from 'next-auth/providers/slack';
import { prisma } from '@/lib/prisma';
import { comparePassword } from './password';
import type { UserPermission } from '@/types';
import type { Adapter } from 'next-auth/adapters';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      permission: UserPermission;
    };
  }

  interface User {
    permission: UserPermission;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    permission: UserPermission;
    permissionRefreshedAt?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
  providers: [
    ...(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
      ? [
          Slack({
            clientId: process.env.SLACK_CLIENT_ID,
            clientSecret: process.env.SLACK_CLIENT_SECRET,
            authorization: {
              params: {
                scope: 'openid profile email',
              },
            },
          }),
        ]
      : []),
    ...(
      process.env.AUTH_REQUIRE_SLACK === 'true' &&
      process.env.SLACK_CLIENT_ID &&
      process.env.SLACK_CLIENT_SECRET
        ? []
        : [Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValidPassword = await comparePassword(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          permission: user.permission as UserPermission,
        };
      },
    })]
    ),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'slack') {
        return true;
      }

      const profileRecord = (profile || {}) as Record<string, unknown>;
      const slackUserIdCandidate =
        account.providerAccountId ||
        (typeof profileRecord.sub === 'string' ? profileRecord.sub : null) ||
        (typeof profileRecord.user_id === 'string' ? profileRecord.user_id : null) ||
        (typeof profileRecord['https://slack.com/user_id'] === 'string'
          ? profileRecord['https://slack.com/user_id']
          : null);

      if (!slackUserIdCandidate) {
        return false;
      }

      const linkedUser = await prisma.user.findFirst({
        where: {
          slackUserId: slackUserIdCandidate,
          deletedAt: null,
        },
      });

      // Only allow Slack sign-in for users explicitly linked by admins.
      if (!linkedUser) {
        return false;
      }

      if (account.providerAccountId) {
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            userId: linkedUser.id,
            access_token: account.access_token ?? null,
            refresh_token: account.refresh_token ?? null,
            expires_at: account.expires_at ?? null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
            session_state: account.session_state
              ? String(account.session_state)
              : null,
          },
          create: {
            userId: linkedUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token ?? null,
            refresh_token: account.refresh_token ?? null,
            expires_at: account.expires_at ?? null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
            session_state: account.session_state
              ? String(account.session_state)
              : null,
          },
        });
      }

      user.id = linkedUser.id;
      user.email = linkedUser.email;
      user.name = linkedUser.name;
      user.image = linkedUser.image;
      user.permission = linkedUser.permission as UserPermission;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.permission = user.permission;
        token.permissionRefreshedAt = Date.now();
      }
      // Backward compat: existing sessions may have 'role' instead of 'permission'
      if (!token.permission && (token as Record<string, unknown>).role) {
        token.permission = (token as Record<string, unknown>).role as UserPermission;
      }
      // Refresh permission from DB at most once every 5 minutes
      const PERMISSION_REFRESH_MS = 5 * 60 * 1000;
      const lastRefresh = token.permissionRefreshedAt ?? 0;
      if (token.id && Date.now() - lastRefresh > PERMISSION_REFRESH_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { permission: true },
          });
          if (dbUser) {
            token.permission = dbUser.permission as UserPermission;
          }
          token.permissionRefreshedAt = Date.now();
        } catch {
          // If DB query fails, keep the cached permission and retry next interval
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.permission = token.permission as UserPermission;
      }
      return session;
    },
  },
});
