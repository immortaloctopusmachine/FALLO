import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string; checklistId: string }>;
}

// PATCH /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { checklistId } = await context.params;
    const body = await request.json();
    const { name, position } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (position !== undefined) updates.position = position;

    const checklist = await prisma.checklist.update({
      where: { id: checklistId },
      data: updates,
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: checklist });
  } catch (error) {
    console.error('Failed to update checklist:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update checklist' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { checklistId } = await context.params;

    await prisma.checklist.delete({
      where: { id: checklistId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete checklist:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete checklist' } },
      { status: 500 }
    );
  }
}
