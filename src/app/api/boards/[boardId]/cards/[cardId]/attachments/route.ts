import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/cards/[cardId]/attachments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { cardId } = await params;

    const attachments = await prisma.attachment.findMany({
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
    });

    return apiSuccess(attachments);
  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return ApiErrors.internal('Failed to fetch attachments');
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/attachments
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
    const { name, url, type, size } = body;

    if (!name || !url || !type) {
      return ApiErrors.validation('Name, URL, and type are required');
    }

    const attachment = await prisma.attachment.create({
      data: {
        name,
        url,
        type,
        size: size || 0,
        cardId,
        uploaderId: session.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        comments: true,
      },
    });

    return apiSuccess(attachment);
  } catch (error) {
    console.error('Failed to create attachment:', error);
    return ApiErrors.internal('Failed to create attachment');
  }
}
