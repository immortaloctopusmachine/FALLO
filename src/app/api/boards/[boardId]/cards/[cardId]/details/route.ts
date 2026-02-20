import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/cards/[cardId]/details
// Batch endpoint: returns comments + attachments in a single round-trip.
// Used by the card hover-prefetch to pre-warm the modal.
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
      select: { id: true },
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    // Fetch comments + attachments in parallel
    const [comments, attachments] = await Promise.all([
      prisma.comment.findMany({
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
      }),
      prisma.attachment.findMany({
        where: { cardId },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          comments: {
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
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return apiSuccess({ comments, attachments });
  } catch (error) {
    console.error('Failed to fetch card details:', error);
    return ApiErrors.internal('Failed to fetch card details');
  }
}
