import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string }>;
}

// GET /api/boards/[boardId]/cards/[cardId]/attachments
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;

    const attachments = await prisma.attachment.findMany({
      where: { cardId },
      include: {
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

    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch attachments' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/attachments
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const body = await request.json();
    const { name, url, type, size } = body;

    if (!name || !url || !type) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_DATA', message: 'Name, URL, and type are required' } },
        { status: 400 }
      );
    }

    const attachment = await prisma.attachment.create({
      data: {
        name,
        url,
        type,
        size: size || 0,
        cardId,
      },
      include: {
        comments: true,
      },
    });

    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    console.error('Failed to create attachment:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create attachment' } },
      { status: 500 }
    );
  }
}
