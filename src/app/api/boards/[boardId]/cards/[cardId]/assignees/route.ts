import { prisma } from '@/lib/prisma';
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
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { cardId } = await params;

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

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return ApiErrors.validation('User ID is required');
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
    return ApiErrors.internal('Failed to remove assignee');
  }
}
