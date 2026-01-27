# API Patterns Reference

## Route Handler Template

```tsx
// src/app/api/boards/[boardId]/cards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkBoardPermission } from '@/lib/permissions';

// Validation schemas
const createCardSchema = z.object({
  type: z.enum(['TASK', 'USER_STORY', 'EPIC', 'UTILITY']),
  title: z.string().min(1).max(500),
  listId: z.string().cuid(),
  description: z.string().optional(),
  taskData: z.object({
    storyPoints: z.number().optional(),
    deadline: z.string().datetime().optional(),
    linkedUserStoryId: z.string().cuid().optional(),
  }).optional(),
  // ... other type-specific data
});

// GET /api/boards/[boardId]/cards
export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // 2. Check permissions
    const hasAccess = await checkBoardPermission(session.user.id, params.boardId, 'view');
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const type = searchParams.get('type');

    // 4. Fetch data
    const cards = await prisma.card.findMany({
      where: {
        list: { boardId: params.boardId },
        ...(listId && { listId }),
        ...(type && { type: type as CardType }),
        archivedAt: null,
      },
      include: {
        assignees: { include: { user: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: { position: 'asc' },
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      data: cards,
    });

  } catch (error) {
    console.error('GET /api/boards/[boardId]/cards error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/cards
export async function POST(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // 2. Check permissions (member+ can create cards)
    const hasAccess = await checkBoardPermission(session.user.id, params.boardId, 'edit');
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // 3. Validate body
    const body = await request.json();
    const validationResult = createCardSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input',
            details: validationResult.error.flatten() 
          } 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 4. Verify list belongs to board
    const list = await prisma.list.findFirst({
      where: { id: data.listId, boardId: params.boardId },
    });
    
    if (!list) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'List not found' } },
        { status: 404 }
      );
    }

    // 5. Get next position
    const lastCard = await prisma.card.findFirst({
      where: { listId: data.listId },
      orderBy: { position: 'desc' },
    });
    const position = (lastCard?.position ?? -1) + 1;

    // 6. Create card
    const card = await prisma.card.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        listId: data.listId,
        position,
        taskData: data.taskData,
      },
      include: {
        assignees: { include: { user: true } },
      },
    });

    // 7. Log activity
    await prisma.activity.create({
      data: {
        action: 'created',
        entity: 'card',
        entityId: card.id,
        data: { cardType: card.type, title: card.title },
        userId: session.user.id,
        boardId: params.boardId,
      },
    });

    return NextResponse.json({ success: true, data: card }, { status: 201 });

  } catch (error) {
    console.error('POST /api/boards/[boardId]/cards error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
```

## Permission Helper

```tsx
// src/lib/permissions.ts
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

type Permission = 'view' | 'edit' | 'admin' | 'super';

const roleHierarchy: Record<Permission, UserRole[]> = {
  view: ['VIEWER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN'],
  edit: ['MEMBER', 'ADMIN', 'SUPER_ADMIN'],
  admin: ['ADMIN', 'SUPER_ADMIN'],
  super: ['SUPER_ADMIN'],
};

export async function checkBoardPermission(
  userId: string,
  boardId: string,
  permission: Permission
): Promise<boolean> {
  // Super admins have access to everything
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  
  if (user?.role === 'SUPER_ADMIN') return true;

  // Check board membership
  const member = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } },
    select: { role: true },
  });

  if (!member) return false;

  return roleHierarchy[permission].includes(member.role);
}
```

## Pagination Helper

```tsx
// src/lib/pagination.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function getPaginationMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function getSkipTake(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
```

## Error Response Helper

```tsx
// src/lib/api-response.ts
import { NextResponse } from 'next/server';

type ErrorCode = 
  | 'AUTH_REQUIRED' 
  | 'FORBIDDEN' 
  | 'NOT_FOUND' 
  | 'VALIDATION_ERROR' 
  | 'RATE_LIMITED' 
  | 'INTERNAL_ERROR';

const statusCodes: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function apiError(code: ErrorCode, message: string, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status: statusCodes[code] }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiSuccessWithMeta<T>(data: T, meta: object, status = 200) {
  return NextResponse.json({ success: true, data, meta }, { status });
}
```

## API Key Authentication (External Clients)

```tsx
// src/lib/api-auth.ts
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function getApiKeyUser() {
  const headersList = headers();
  const authHeader = headersList.get('authorization');
  
  if (!authHeader?.startsWith('Bearer pp_')) {
    return null;
  }

  const apiKey = authHeader.replace('Bearer ', '');
  
  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey, revokedAt: null },
    include: { user: true },
  });

  if (!key) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return key.user;
}

// Usage in route handler
export async function GET(request: NextRequest) {
  // Try session first, then API key
  const session = await getServerSession(authOptions);
  const user = session?.user ?? await getApiKeyUser();
  
  if (!user) {
    return apiError('AUTH_REQUIRED', 'Authentication required');
  }
  
  // ... rest of handler
}
```

## Optimistic Updates Pattern (Client)

```tsx
// src/hooks/useMoveCard.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useMoveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      cardId, 
      toListId, 
      position 
    }: { 
      cardId: string; 
      toListId: string; 
      position: number;
    }) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: toListId, position }),
      });
      if (!res.ok) throw new Error('Failed to move card');
      return res.json();
    },
    
    // Optimistic update
    onMutate: async ({ cardId, toListId, position }) => {
      await queryClient.cancelQueries({ queryKey: ['boards'] });
      
      const previousData = queryClient.getQueryData(['boards']);
      
      queryClient.setQueryData(['boards'], (old: BoardData) => {
        // Update card position optimistically
        return updateCardPosition(old, cardId, toListId, position);
      });
      
      return { previousData };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['boards'], context.previousData);
      }
    },
    
    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
```
