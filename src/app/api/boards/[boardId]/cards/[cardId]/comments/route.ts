import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/cards/[cardId]/comments
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

    // Verify card exists and belongs to this board
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: { boardId },
      },
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    const comments = await prisma.comment.findMany({
      where: { cardId, attachmentId: null },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return ApiErrors.internal('Failed to fetch comments');
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/comments
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
    const { content, attachmentId, type } = body;

    if (!content?.trim()) {
      return ApiErrors.validation('Comment content is required');
    }

    const commentType = type === 'review_submission' ? 'review_submission' : 'standard';

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        type: commentType,
        authorId: session.user.id,
        cardId,
        ...(attachmentId && { attachmentId }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return apiSuccess(comment);
  } catch (error) {
    console.error('Failed to create comment:', error);
    return ApiErrors.internal('Failed to create comment');
  }
}
