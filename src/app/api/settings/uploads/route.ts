import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

type UploadKind = 'image' | 'file';
type SortBy = 'uploadedAt' | 'name' | 'size' | 'uploader';
type SortOrder = 'asc' | 'desc';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseKind(value: string | null): UploadKind {
  return value === 'file' ? 'file' : 'image';
}

function parseSortBy(value: string | null): SortBy {
  if (value === 'name' || value === 'size' || value === 'uploader') return value;
  return 'uploadedAt';
}

function parseSortOrder(value: string | null): SortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

function buildOrderBy(sortBy: SortBy, sortOrder: SortOrder): Prisma.AttachmentOrderByWithRelationInput[] {
  if (sortBy === 'name') {
    return [{ name: sortOrder }, { createdAt: 'desc' }];
  }
  if (sortBy === 'size') {
    return [{ size: sortOrder }, { createdAt: 'desc' }];
  }
  if (sortBy === 'uploader') {
    return [{ uploader: { name: sortOrder } }, { createdAt: 'desc' }];
  }
  return [{ createdAt: sortOrder }, { id: 'desc' }];
}

function buildKindWhere(kind: UploadKind): Prisma.AttachmentWhereInput {
  if (kind === 'file') {
    return { NOT: { type: { startsWith: 'image/' } } };
  }
  return { type: { startsWith: 'image/' } };
}

// GET /api/settings/uploads
export async function GET(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });
    if (user?.permission !== 'SUPER_ADMIN') {
      return ApiErrors.forbidden('Super Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const kind = parseKind(searchParams.get('kind'));
    const sortBy = parseSortBy(searchParams.get('sortBy'));
    const sortOrder = parseSortOrder(searchParams.get('sortOrder'));
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const requestedLimit = parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const includeUploaders = searchParams.get('includeUploaders') === 'true';
    const q = searchParams.get('q')?.trim() || '';
    const uploaderId = searchParams.get('uploaderId')?.trim() || '';

    const kindWhere = buildKindWhere(kind);

    const where: Prisma.AttachmentWhereInput = {
      ...kindWhere,
      ...(uploaderId ? { uploaderId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { type: { contains: q, mode: 'insensitive' } },
              { card: { title: { contains: q, mode: 'insensitive' } } },
              { card: { list: { name: { contains: q, mode: 'insensitive' } } } },
              { card: { list: { board: { name: { contains: q, mode: 'insensitive' } } } } },
              { uploader: { name: { contains: q, mode: 'insensitive' } } },
              { uploader: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;
    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [rows, uploaders] = await Promise.all([
      prisma.attachment.findMany({
        where,
        orderBy,
        skip,
        take: limit + 1,
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          size: true,
          createdAt: true,
          uploaderId: true,
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          card: {
            select: {
              id: true,
              title: true,
              list: {
                select: {
                  id: true,
                  name: true,
                  board: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      includeUploaders
        ? prisma.user.findMany({
            where: {
              attachments: { some: kindWhere },
            },
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              _count: {
                select: {
                  attachments: {
                    where: kindWhere,
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return apiSuccess({
      items,
      pagination: {
        page,
        limit,
        hasMore,
      },
      uploaders: includeUploaders
        ? uploaders.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.image,
            attachmentCount: u._count.attachments,
          }))
        : undefined,
    });
  } catch (error) {
    console.error('Failed to fetch uploads library:', error);
    return ApiErrors.internal('Failed to fetch uploads library');
  }
}
