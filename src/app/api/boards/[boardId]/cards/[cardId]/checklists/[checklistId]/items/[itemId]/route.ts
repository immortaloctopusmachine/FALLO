import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string; checklistId: string; itemId: string }>;
}

// PATCH /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { itemId } = await context.params;
    const body = await request.json();
    const { content, isComplete, position } = body;

    const updates: Record<string, unknown> = {};
    if (content !== undefined) updates.content = content.trim();
    if (isComplete !== undefined) updates.isComplete = isComplete;
    if (position !== undefined) updates.position = position;

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updates,
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Failed to update checklist item:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update checklist item' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { itemId } = await context.params;

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete checklist item:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete checklist item' } },
      { status: 500 }
    );
  }
}
