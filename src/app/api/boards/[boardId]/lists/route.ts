import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// POST /api/boards/[boardId]/lists - Create a new list
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { name, viewType, phase, color, durationWeeks, durationDays, startDate, endDate } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('List name is required');
    }

    // Validate viewType if provided
    const validViewTypes = ['TASKS', 'PLANNING'];
    const listViewType = viewType && validViewTypes.includes(viewType) ? viewType : 'TASKS';

    // Validate phase if provided
    const validPhases = ['BACKLOG', 'SPINE_PROTOTYPE', 'CONCEPT', 'PRODUCTION', 'TWEAK', 'DONE'];
    const listPhase = phase && validPhases.includes(phase) ? phase : null;

    // Get the highest position for this view type
    const lastList = await prisma.list.findFirst({
      where: {
        boardId,
        viewType: listViewType,
      },
      orderBy: { position: 'desc' },
    });

    // Create the list
    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        position: (lastList?.position ?? -1) + 1,
        boardId,
        viewType: listViewType,
        phase: listPhase,
        color: color || null,
        durationWeeks: durationWeeks || null,
        durationDays: durationDays || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    // For PLANNING lists with dates, auto-create a linked timeline block
    let timelineBlock = null;
    if (listViewType === 'PLANNING' && startDate && endDate) {
      // Map list phase to block type search terms
      const phaseSearchTerms: Record<string, string[]> = {
        'SPINE_PROTOTYPE': ['spine', 'prototype'],
        'CONCEPT': ['concept'],
        'PRODUCTION': ['production'],
        'TWEAK': ['tweak'],
        'BACKLOG': ['backlog'],
        'DONE': ['done', 'complete'],
      };

      // Get search terms for this phase, or use list name if no phase
      const searchTerms = listPhase ? phaseSearchTerms[listPhase] : null;
      const listNameLower = name.toLowerCase();

      // Find matching block type
      let blockType = null;

      // First try to find by phase-specific search terms
      if (searchTerms) {
        for (const term of searchTerms) {
          blockType = await prisma.blockType.findFirst({
            where: {
              name: { contains: term, mode: 'insensitive' },
            },
          });
          if (blockType) break;
        }
      }

      // If not found, try to match by list name
      if (!blockType) {
        // Try matching parts of the list name
        const nameParts = listNameLower.split(/[\s\/\-]+/);
        for (const part of nameParts) {
          if (part.length > 2) { // Skip short words
            blockType = await prisma.blockType.findFirst({
              where: {
                name: { contains: part, mode: 'insensitive' },
              },
            });
            if (blockType) break;
          }
        }
      }

      // If still not found, try to find any default block type
      if (!blockType) {
        blockType = await prisma.blockType.findFirst({
          where: { isDefault: true },
        });
      }

      // If still not found, create a new block type based on the list name
      if (!blockType) {
        blockType = await prisma.blockType.create({
          data: {
            name: name.trim(),
            color: color || '#6B7280',
            isDefault: false,
            position: 0,
          },
        });
      }

      // Get highest position for timeline blocks in this board
      const lastBlock = await prisma.timelineBlock.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
      });

      // Create the timeline block linked to this list
      timelineBlock = await prisma.timelineBlock.create({
        data: {
          boardId,
          blockTypeId: blockType.id,
          listId: list.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          position: (lastBlock?.position ?? -1) + 1,
        },
        include: {
          blockType: {
            select: {
              name: true,
              color: true,
            },
          },
        },
      });

      // Update board's end date to match the latest planning list end date
      // Find the latest end date across all planning lists for this board
      const allPlanningLists = await prisma.list.findMany({
        where: {
          boardId,
          viewType: 'PLANNING',
          endDate: { not: null },
        },
        orderBy: { endDate: 'desc' },
        take: 1,
      });

      if (allPlanningLists.length > 0 && allPlanningLists[0].endDate) {
        const board = await prisma.board.findUnique({
          where: { id: boardId },
          select: { settings: true },
        });

        const currentSettings = (board?.settings as Record<string, unknown>) || {};
        const latestEndDate = allPlanningLists[0].endDate.toISOString();

        // Update board settings with the calculated end date
        await prisma.board.update({
          where: { id: boardId },
          data: {
            settings: {
              ...currentSettings,
              lastDayAnimationTweaks: latestEndDate,
            },
          },
        });
      }
    }

    // Return list with timeline block info
    return apiSuccess({
      ...list,
      timelineBlockId: timelineBlock?.id || null,
      timelineBlock: timelineBlock ? {
        id: timelineBlock.id,
        blockType: timelineBlock.blockType,
      } : null,
    }, 201);
  } catch (error) {
    console.error('Failed to create list:', error);
    return ApiErrors.internal('Failed to create list');
  }
}
