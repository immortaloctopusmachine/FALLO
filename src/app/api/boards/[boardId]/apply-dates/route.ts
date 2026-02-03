import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BOARD_TEMPLATES, calculateListDates } from '@/lib/list-templates';
import type { BoardTemplateType } from '@/types';

// POST /api/boards/[boardId]/apply-dates - Apply dates to planning lists based on project start date
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

    // Get board with settings and planning lists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          where: { viewType: 'PLANNING' },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } },
        { status: 404 }
      );
    }

    const settings = (board.settings as Record<string, unknown>) || {};
    const projectStartDate = settings.projectStartDate as string | undefined;
    const listTemplate = (settings.listTemplate as BoardTemplateType) || 'STANDARD_SLOT';

    if (!projectStartDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Project start date not set in board settings' } },
        { status: 400 }
      );
    }

    // Get the template
    const template = BOARD_TEMPLATES[listTemplate];
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid list template' } },
        { status: 400 }
      );
    }

    // Calculate dates based on project start date
    const listDates = calculateListDates(template, new Date(projectStartDate));

    // Update each planning list with calculated dates
    const updatedLists = [];
    for (const list of board.lists) {
      // Find matching date entry by position or name
      const dateEntry = listDates.find((d) =>
        d.listName.toLowerCase() === list.name.toLowerCase() ||
        listDates.indexOf(d) === list.position - template.taskLists.length
      );

      if (dateEntry) {
        await prisma.list.update({
          where: { id: list.id },
          data: {
            startDate: dateEntry.startDate,
            endDate: dateEntry.endDate,
            durationDays: dateEntry.durationDays,
          },
        });
        updatedLists.push({ id: list.id, name: list.name, ...dateEntry });
      }
    }

    // Also update the board's lastDayAnimationTweaks setting based on the last list's end date
    if (updatedLists.length > 0) {
      const lastList = updatedLists[updatedLists.length - 1];
      await prisma.board.update({
        where: { id: boardId },
        data: {
          settings: {
            ...settings,
            lastDayAnimationTweaks: lastList.endDate.toISOString(),
          },
        },
      });
    }

    // Now create timeline blocks for all planning lists that have dates
    const planningListsWithDates = await prisma.list.findMany({
      where: {
        boardId,
        viewType: 'PLANNING',
        startDate: { not: null },
        endDate: { not: null },
        timelineBlock: null, // No existing timeline block
      },
      orderBy: { position: 'asc' },
    });

    const createdBlocks = [];
    if (planningListsWithDates.length > 0) {
      // Get the highest position for timeline blocks in this board
      const lastBlock = await prisma.timelineBlock.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
      });

      let currentPosition = (lastBlock?.position ?? -1) + 1;

      for (const list of planningListsWithDates) {
        // Map list phase to block type search terms
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
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Applied dates to ${updatedLists.length} lists, created ${createdBlocks.length} timeline blocks`,
        listsUpdated: updatedLists.length,
        blocksCreated: createdBlocks.length,
        lists: updatedLists,
        blocks: createdBlocks,
      },
    });
  } catch (error) {
    console.error('Failed to apply dates:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to apply dates' } },
      { status: 500 }
    );
  }
}
