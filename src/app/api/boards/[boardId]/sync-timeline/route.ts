import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/boards/[boardId]/sync-timeline - Create timeline blocks for existing planning lists
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin of this board
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        permission: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } },
        { status: 403 }
      );
    }

    // Get all planning lists without timeline blocks
    const planningLists = await prisma.list.findMany({
      where: {
        boardId,
        viewType: 'PLANNING',
        startDate: { not: null },
        endDate: { not: null },
        timelineBlock: null, // No existing timeline block
      },
      orderBy: { position: 'asc' },
    });

    if (planningLists.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: 'No planning lists need timeline blocks', created: 0 },
      });
    }

    // Get the highest position for timeline blocks in this board
    const lastBlock = await prisma.timelineBlock.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    let currentPosition = (lastBlock?.position ?? -1) + 1;
    const createdBlocks = [];

    for (const list of planningLists) {
      // Find matching block type based on phase or list name
      const phaseSearchTerms: Record<string, string[]> = {
        'SPINE_PROTOTYPE': ['spine', 'prototype'],
        'CONCEPT': ['concept'],
        'PRODUCTION': ['production'],
        'TWEAK': ['tweak'],
        'BACKLOG': ['backlog'],
        'DONE': ['done', 'complete'],
      };

      const searchTerms = list.phase ? phaseSearchTerms[list.phase] : null;
      const listNameLower = list.name.toLowerCase();

      let blockType = null;

      // First try to find by phase-specific search terms
      if (searchTerms) {
        for (const term of searchTerms) {
          blockType = await prisma.blockType.findFirst({
            where: { name: { contains: term, mode: 'insensitive' } },
          });
          if (blockType) break;
        }
      }

      // If not found, try to match by list name
      if (!blockType) {
        const nameParts = listNameLower.split(/[\s\/\-]+/);
        for (const part of nameParts) {
          if (part.length > 2) {
            blockType = await prisma.blockType.findFirst({
              where: { name: { contains: part, mode: 'insensitive' } },
            });
            if (blockType) break;
          }
        }
      }

      // If still not found, use any default block type
      if (!blockType) {
        blockType = await prisma.blockType.findFirst({
          where: { isDefault: true },
        });
      }

      // If still not found, create a new block type
      if (!blockType) {
        blockType = await prisma.blockType.create({
          data: {
            name: list.name,
            color: list.color || '#6B7280',
            isDefault: false,
            position: 0,
          },
        });
      }

      // Create the timeline block
      const timelineBlock = await prisma.timelineBlock.create({
        data: {
          boardId,
          blockTypeId: blockType.id,
          listId: list.id,
          startDate: list.startDate!,
          endDate: list.endDate!,
          position: currentPosition++,
        },
        include: {
          blockType: {
            select: { name: true, color: true },
          },
          list: {
            select: { name: true },
          },
        },
      });

      createdBlocks.push({
        id: timelineBlock.id,
        listName: list.name,
        blockTypeName: timelineBlock.blockType.name,
      });
    }

    // Update board's end date to the latest planning list end date
    const latestList = await prisma.list.findFirst({
      where: {
        boardId,
        viewType: 'PLANNING',
        endDate: { not: null },
      },
      orderBy: { endDate: 'desc' },
    });

    if (latestList?.endDate) {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { settings: true },
      });

      const currentSettings = (board?.settings as Record<string, unknown>) || {};

      await prisma.board.update({
        where: { id: boardId },
        data: {
          settings: {
            ...currentSettings,
            lastDayAnimationTweaks: latestList.endDate.toISOString(),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Created ${createdBlocks.length} timeline blocks`,
        created: createdBlocks.length,
        blocks: createdBlocks,
      },
    });
  } catch (error) {
    console.error('Failed to sync timeline blocks:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync timeline blocks' } },
      { status: 500 }
    );
  }
}
