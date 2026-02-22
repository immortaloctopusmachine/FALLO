import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/cards/[cardId]/assignees
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const card = await prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    const assignees = await prisma.cardUser.findMany({
      where: { cardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            permission: true,
          },
        },
      },
    });

    return apiSuccess(assignees);
  } catch (error) {
    console.error('Failed to fetch assignees:', error);
    return ApiErrors.internal('Failed to fetch assignees');
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/assignees
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const card = await prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

    if (!userId) {
      return ApiErrors.validation('User ID is required');
    }

    const assigneeMembership = await prisma.boardMember.findUnique({
      where: {
        userId_boardId: { userId, boardId },
      },
      select: { userId: true },
    });

    if (!assigneeMembership) {
      return ApiErrors.validation('User is not a member of this board');
    }

    // Check if already assigned
    const existing = await prisma.cardUser.findUnique({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    if (existing) {
      return ApiErrors.conflict('User is already assigned');
    }

    const assignee = await prisma.cardUser.create({
      data: { userId, cardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            permission: true,
          },
        },
      },
    });

    return apiSuccess(assignee);
  } catch (error) {
    console.error('Failed to add assignee:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return ApiErrors.conflict('User is already assigned');
      }
      if (error.code === 'P2003' || error.code === 'P2025') {
        return ApiErrors.notFound('Card');
      }
      return ApiErrors.internal(`Failed to add assignee (${error.code})`);
    }
    return ApiErrors.internal('Failed to add assignee');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/assignees
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return ApiErrors.validation('User ID is required');
    }

    await prisma.cardUser.delete({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to remove assignee:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return ApiErrors.notFound('Assignee');
      }
      return ApiErrors.internal(`Failed to remove assignee (${error.code})`);
    }
    return ApiErrors.internal('Failed to remove assignee');
  }
}
