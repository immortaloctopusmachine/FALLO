import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/cards/[cardId]/checklists
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { cardId } = await params;

    const checklists = await prisma.checklist.findMany({
      where: { cardId },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    return apiSuccess(checklists);
  } catch (error) {
    console.error('Failed to fetch checklists:', error);
    return ApiErrors.internal('Failed to fetch checklists');
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/checklists
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
    const { name, type = 'todo' } = body;

    if (!name?.trim()) {
      return ApiErrors.validation('Checklist name is required');
    }

    // Get highest position
    const lastChecklist = await prisma.checklist.findFirst({
      where: { cardId },
      orderBy: { position: 'desc' },
    });

    const checklist = await prisma.checklist.create({
      data: {
        name: name.trim(),
        type,
        position: (lastChecklist?.position ?? -1) + 1,
        cardId,
      },
      include: {
        items: true,
      },
    });

    return apiSuccess(checklist);
  } catch (error) {
    console.error('Failed to create checklist:', error);
    return ApiErrors.internal('Failed to create checklist');
  }
}
