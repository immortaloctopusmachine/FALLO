import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BOARD_TEMPLATES, calculateListDates } from '@/lib/list-templates';
import type { BoardTemplateType, ListViewType, ListPhase } from '@/types';

// GET /api/boards - Get all boards for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
        archivedAt: null,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { cards: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: boards });
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch boards' } },
      { status: 500 }
    );
  }
}

// POST /api/boards - Create a new board
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, template = 'BLANK', teamId, startDate } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board name is required' } },
        { status: 400 }
      );
    }

    // Get template configuration
    const templateType = template as BoardTemplateType;
    const templateConfig = BOARD_TEMPLATES[templateType] || BOARD_TEMPLATES.BLANK;

    // Calculate list dates if startDate is provided
    let listDates: { listName: string; startDate: Date; endDate: Date; durationDays?: number }[] = [];
    if (startDate && templateType !== 'BLANK') {
      listDates = calculateListDates(templateConfig, new Date(startDate));
    }

    // Build list creation data from template
    const listsToCreate = [
      ...templateConfig.taskLists.map((list) => ({
        name: list.name,
        position: list.position,
        viewType: list.viewType as ListViewType,
        phase: list.phase as ListPhase | undefined,
        color: list.color,
        durationWeeks: list.durationWeeks,
      })),
      ...templateConfig.planningLists.map((list, idx) => {
        // Find matching date entry if dates were calculated
        const dateEntry = listDates.find((d) =>
          d.listName.toLowerCase() === list.name.toLowerCase()
        );
        return {
          name: list.name,
          position: templateConfig.taskLists.length + idx,
          viewType: list.viewType as ListViewType,
          phase: list.phase as ListPhase | undefined,
          color: list.color,
          durationWeeks: list.durationWeeks,
          durationDays: dateEntry?.durationDays,
          startDate: dateEntry?.startDate,
          endDate: dateEntry?.endDate,
        };
      }),
    ];

    // Store which template was used in settings (for non-BLANK templates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings: Record<string, any> = templateType !== 'BLANK'
      ? { listTemplate: templateType }
      : {};

    // Store project start date in settings
    if (startDate) {
      settings.projectStartDate = startDate;
    }

    // If teamId provided, get all team members to add to board
    let teamMembersToAdd: { userId: string; permission: 'MEMBER' | 'ADMIN' }[] = [];
    if (teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true, permission: true },
      });
      // Add all team members except the creator (who will be added as admin)
      teamMembersToAdd = teamMembers
        .filter((m) => m.userId !== session.user.id)
        .map((m) => ({
          userId: m.userId,
          permission: m.permission === 'ADMIN' || m.permission === 'SUPER_ADMIN' ? 'ADMIN' as const : 'MEMBER' as const,
        }));
    }

    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        settings,
        teamId: teamId || null,
        members: {
          create: [
            {
              userId: session.user.id,
              permission: 'ADMIN',
            },
            ...teamMembersToAdd,
          ],
        },
        lists: {
          create: listsToCreate,
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        lists: {
          orderBy: { position: 'asc' },
        },
      },
    });

    // If start date is provided and we have planning lists with dates, create timeline blocks
    if (startDate && templateType !== 'BLANK') {
      const planningLists = await prisma.list.findMany({
        where: {
          boardId: board.id,
          viewType: 'PLANNING',
          startDate: { not: null },
          endDate: { not: null },
        },
        orderBy: { position: 'asc' },
      });

      // Create timeline blocks for each planning list
      const phaseSearchTerms: Record<string, string[]> = {
        'SPINE_PROTOTYPE': ['spine', 'prototype', 'setup'],
        'CONCEPT': ['concept'],
        'PRODUCTION': ['production'],
        'TWEAK': ['tweak'],
      };

      let blockPosition = 0;
      for (const list of planningLists) {
        // Find matching block type
        const searchTerms = list.phase ? phaseSearchTerms[list.phase] : null;
        const listNameLower = list.name.toLowerCase();

        let blockType = null;

        // First try by phase
        if (searchTerms) {
          for (const term of searchTerms) {
            blockType = await prisma.blockType.findFirst({
              where: { name: { contains: term, mode: 'insensitive' } },
            });
            if (blockType) break;
          }
        }

        // Try by list name
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

        // Use default or create new
        if (!blockType) {
          blockType = await prisma.blockType.findFirst({
            where: { isDefault: true },
          });
        }

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

        // Create timeline block
        await prisma.timelineBlock.create({
          data: {
            boardId: board.id,
            blockTypeId: blockType.id,
            listId: list.id,
            startDate: list.startDate!,
            endDate: list.endDate!,
            position: blockPosition++,
          },
        });
      }

      // Update board settings with lastDayAnimationTweaks
      if (planningLists.length > 0) {
        const lastList = planningLists[planningLists.length - 1];
        await prisma.board.update({
          where: { id: board.id },
          data: {
            settings: {
              ...settings,
              lastDayAnimationTweaks: lastList.endDate?.toISOString(),
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: board }, { status: 201 });
  } catch (error) {
    console.error('Failed to create board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create board' } },
      { status: 500 }
    );
  }
}
