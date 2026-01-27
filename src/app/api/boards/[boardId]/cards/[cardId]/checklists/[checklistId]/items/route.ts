import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string; checklistId: string }>;
}

// POST /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { checklistId } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CONTENT', message: 'Item content is required' } },
        { status: 400 }
      );
    }

    // Get highest position
    const lastItem = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
    });

    const item = await prisma.checklistItem.create({
      data: {
        content: content.trim(),
        position: (lastItem?.position ?? -1) + 1,
        checklistId,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Failed to create checklist item:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create checklist item' } },
      { status: 500 }
    );
  }
}
