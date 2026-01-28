import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string; attachmentId: string }>;
}

// DELETE /api/boards/[boardId]/cards/[cardId]/attachments/[attachmentId]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { attachmentId } = await context.params;

    // Get the attachment to find the file path
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Attachment not found' } },
        { status: 404 }
      );
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    // Try to delete the file (don't fail if file doesn't exist)
    if (attachment.url.startsWith('/uploads/')) {
      const filename = attachment.url.replace('/uploads/', '');
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      try {
        await unlink(filepath);
      } catch {
        // File might not exist, that's ok
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete attachment' } },
      { status: 500 }
    );
  }
}
