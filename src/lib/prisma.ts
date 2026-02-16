import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string | undefined {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) return undefined;

  try {
    const parsed = new URL(rawDatabaseUrl);
    const isSupabasePooler = parsed.hostname.endsWith('pooler.supabase.com');

    // On serverless runtimes, keep Prisma's pool usage minimal for Supabase pooler URLs.
    if (isSupabasePooler) {
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1');
      }
      return parsed.toString();
    }

    return rawDatabaseUrl;
  } catch {
    return rawDatabaseUrl;
  }
}

const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
};

const resolvedDatabaseUrl = resolveDatabaseUrl();
if (resolvedDatabaseUrl) {
  prismaOptions.datasources = {
    db: { url: resolvedDatabaseUrl },
  };
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
