import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { normalizeModuleTaskTemplates } from '@/lib/modules';

interface ApplyTaskOverride {
  taskTemplateId: string;
  destinationMode?: 'IMMEDIATE' | 'STAGED';
  immediateListId?: string;
  stagingPlanningListId?: string;
  releaseTargetListId?: string;
  title?: string;
}

function getPreviousFriday(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - 1);
  while (result.getDay() !== 5) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

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
    const moduleId = typeof body?.moduleId === 'string' ? body.moduleId : '';
    const planningListId = typeof body?.planningListId === 'string' ? body.planningListId : '';
    const epicNameOverride = typeof body?.epicName === 'string' ? body.epicName.trim() : '';
    const userStoryTitle = typeof body?.userStoryTitle === 'string' ? body.userStoryTitle.trim() : '';
    const taskOverrides: ApplyTaskOverride[] = Array.isArray(body?.tasks) ? body.tasks : [];

    if (!moduleId) return ApiErrors.validation('moduleId is required');
    if (!planningListId) return ApiErrors.validation('planningListId is required');

    const moduleDef = await prisma.boardModule.findUnique({ where: { id: moduleId } });
    if (!moduleDef) return ApiErrors.notFound('Module');

    const planningList = await prisma.list.findFirst({
      where: {
        id: planningListId,
        boardId,
        viewType: 'PLANNING',
      },
      select: {
        id: true,
        startDate: true,
      },
    });

    if (!planningList) {
      return ApiErrors.validation('Planning list not found in this board');
    }

    const taskTemplates = normalizeModuleTaskTemplates(moduleDef.taskTemplates);
    if (taskTemplates.length === 0) {
      return ApiErrors.validation('Selected module has no task templates');
    }

    const mergedTaskTemplates = taskTemplates.map((template, index) => {
      const override = taskOverrides.find((item) => item.taskTemplateId === template.id);
      return { template, override, index };
    });

    // Keep original template order stable, but always respect chainOrder within
    // each linked group so dependency links are created deterministically.
    const mergedTaskTemplatesByChainGroup = new Map<string, typeof mergedTaskTemplates>();
    mergedTaskTemplates.forEach((item) => {
      const chainGroupId = item.template.chainGroupId;
      if (!chainGroupId) return;
      const existing = mergedTaskTemplatesByChainGroup.get(chainGroupId) || [];
      existing.push(item);
      mergedTaskTemplatesByChainGroup.set(chainGroupId, existing);
    });

    const sortedByChainGroup = new Map<string, typeof mergedTaskTemplates>();
    mergedTaskTemplatesByChainGroup.forEach((items, chainGroupId) => {
      const sortedItems = [...items].sort((a, b) => {
        const aOrder = typeof a.template.chainOrder === 'number' ? a.template.chainOrder : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.template.chainOrder === 'number' ? b.template.chainOrder : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.index - b.index;
      });
      sortedByChainGroup.set(chainGroupId, sortedItems);
    });

    const emittedChainGroups = new Set<string>();
    const orderedMergedTaskTemplates = [] as typeof mergedTaskTemplates;
    mergedTaskTemplates.forEach((item) => {
      const chainGroupId = item.template.chainGroupId;
      if (!chainGroupId) {
        orderedMergedTaskTemplates.push(item);
        return;
      }

      if (emittedChainGroups.has(chainGroupId)) {
        return;
      }

      emittedChainGroups.add(chainGroupId);
      orderedMergedTaskTemplates.push(...(sortedByChainGroup.get(chainGroupId) || [item]));
    });

    const taskListIds = new Set<string>();
    const stagingListIds = new Set<string>();

    orderedMergedTaskTemplates.forEach(({ template, override }) => {
      const mode = override?.destinationMode || template.destinationMode;
      if (mode === 'IMMEDIATE') {
        if (override?.immediateListId) taskListIds.add(override.immediateListId);
      } else {
        if (override?.releaseTargetListId) taskListIds.add(override.releaseTargetListId);
        if (override?.stagingPlanningListId) stagingListIds.add(override.stagingPlanningListId);
      }
    });

    const resolvedTaskLists = taskListIds.size > 0
      ? await prisma.list.findMany({
          where: {
            id: { in: Array.from(taskListIds) },
            boardId,
            viewType: 'TASKS',
          },
          select: {
            id: true,
          },
        })
      : [];

    const resolvedPlanningLists = stagingListIds.size > 0
      ? await prisma.list.findMany({
          where: {
            id: { in: Array.from(stagingListIds) },
            boardId,
            viewType: 'PLANNING',
          },
          select: {
            id: true,
            startDate: true,
          },
        })
      : [];

    const taskListById = new Map(resolvedTaskLists.map((list) => [list.id, list]));
    const planningListById = new Map(resolvedPlanningLists.map((list) => [list.id, list]));

    const fallbackBacklogList = await prisma.list.findFirst({
      where: {
        boardId,
        viewType: 'TASKS',
        phase: 'BACKLOG',
      },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    const fallbackTaskList = fallbackBacklogList || await prisma.list.findFirst({
      where: {
        boardId,
        viewType: 'TASKS',
      },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    if (!fallbackTaskList) {
      return ApiErrors.validation('Board has no Tasks-view list to place module tasks');
    }

    const epicName = epicNameOverride || moduleDef.epicName;
    if (!epicName) return ApiErrors.validation('Epic name is required');

    const epicPlacementList = await prisma.list.findFirst({
      where: { boardId, viewType: 'PLANNING' },
      orderBy: { position: 'asc' },
      select: { id: true },
    }) || await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    if (!epicPlacementList) {
      return ApiErrors.validation('Board has no list available for Epic placement');
    }

    const epic = await prisma.card.findFirst({
      where: {
        type: 'EPIC',
        archivedAt: null,
        title: {
          equals: epicName,
          mode: 'insensitive',
        },
        list: { boardId },
      },
      select: { id: true },
    });

    const listIdsNeedingPosition = new Set<string>([planningList.id, epicPlacementList.id]);

    orderedMergedTaskTemplates.forEach(({ template, override }) => {
      const mode = override?.destinationMode || template.destinationMode;
      if (mode === 'IMMEDIATE') {
        listIdsNeedingPosition.add(override?.immediateListId || fallbackTaskList.id);
      } else {
        listIdsNeedingPosition.add(override?.stagingPlanningListId || planningList.id);
      }
    });

    const maxPositions = await prisma.card.groupBy({
      by: ['listId'],
      where: {
        listId: { in: Array.from(listIdsNeedingPosition) },
        archivedAt: null,
      },
      _max: { position: true },
    });

    const nextPositionByList = new Map<string, number>();
    listIdsNeedingPosition.forEach((listId) => nextPositionByList.set(listId, 0));
    maxPositions.forEach((row) => nextPositionByList.set(row.listId, (row._max.position ?? -1) + 1));

    const created = await prisma.$transaction(async (tx) => {
      let epicId = epic?.id;

      if (!epicId) {
        const epicPosition = nextPositionByList.get(epicPlacementList.id) ?? 0;
        nextPositionByList.set(epicPlacementList.id, epicPosition + 1);

        const createdEpic = await tx.card.create({
          data: {
            title: epicName,
            type: 'EPIC',
            listId: epicPlacementList.id,
            position: epicPosition,
            epicData: {},
          },
        });
        epicId = createdEpic.id;
      }

      const storyTitle = userStoryTitle || moduleDef.symbol;
      const userStoryPosition = nextPositionByList.get(planningList.id) ?? 0;
      nextPositionByList.set(planningList.id, userStoryPosition + 1);

      const userStory = await tx.card.create({
        data: {
          title: storyTitle,
          type: 'USER_STORY',
          listId: planningList.id,
          position: userStoryPosition,
          description: moduleDef.userStoryDescription,
          featureImage: moduleDef.userStoryFeatureImage,
          userStoryData: {
            linkedEpicId: epicId,
            flags: [],
          },
        },
      });

      const createdTasks = [] as Array<{ id: string }>;
      const previousTaskIdByChain = new Map<string, string | null>();

      for (const { template, override } of orderedMergedTaskTemplates) {
        const mode = override?.destinationMode || template.destinationMode;
        const taskTitle = (override?.title?.trim() || `${storyTitle} - ${template.title}`);
        const chainKey = template.chainGroupId ? `chain:${template.chainGroupId}` : `single:${template.id}`;
        const dependsOnTaskId = previousTaskIdByChain.get(chainKey) || null;

        if (mode === 'IMMEDIATE') {
          const immediateListId = override?.immediateListId || fallbackTaskList.id;
          if (!taskListById.has(immediateListId) && immediateListId !== fallbackTaskList.id) {
            throw new Error(`Invalid immediate list for ${template.title}`);
          }

          const taskPosition = nextPositionByList.get(immediateListId) ?? 0;
          nextPositionByList.set(immediateListId, taskPosition + 1);

          const createdTaskId = (await tx.card.create({
            data: {
              title: taskTitle,
              type: 'TASK',
              listId: immediateListId,
              position: taskPosition,
              color: template.color,
              description: template.description,
              featureImage: template.featureImage,
              taskData: {
                linkedUserStoryId: userStory.id,
                linkedEpicId: epicId,
                storyPoints: template.storyPoints,
                dependsOnTaskId,
                releaseMode: 'IMMEDIATE',
                stagedFromPlanningListId: null,
                scheduledReleaseDate: null,
                releaseTargetListId: immediateListId,
                releasedAt: new Date().toISOString(),
              },
            },
            select: { id: true },
          })).id;

          previousTaskIdByChain.set(chainKey, createdTaskId);
          createdTasks.push({ id: createdTaskId });
          continue;
        }

        const stagingPlanningListId = override?.stagingPlanningListId || planningList.id;
        const releaseTargetListId = override?.releaseTargetListId || fallbackTaskList.id;

        const stagingList = stagingPlanningListId === planningList.id
          ? planningList
          : planningListById.get(stagingPlanningListId);

        if (!stagingList) {
          throw new Error(`Invalid staging planning list for ${template.title}`);
        }

        if (!stagingList.startDate) {
          throw new Error(`Staging list must have a start date for ${template.title}`);
        }

        if (!taskListById.has(releaseTargetListId) && releaseTargetListId !== fallbackTaskList.id) {
          throw new Error(`Invalid release target list for ${template.title}`);
        }

        const scheduledReleaseDate = getPreviousFriday(stagingList.startDate);
        const taskPosition = nextPositionByList.get(stagingPlanningListId) ?? 0;
        nextPositionByList.set(stagingPlanningListId, taskPosition + 1);

        const createdTaskId = (await tx.card.create({
          data: {
            title: taskTitle,
            type: 'TASK',
            listId: stagingPlanningListId,
            position: taskPosition,
            color: template.color,
            description: template.description,
            featureImage: template.featureImage,
            taskData: {
              linkedUserStoryId: userStory.id,
              linkedEpicId: epicId,
              storyPoints: template.storyPoints,
              dependsOnTaskId,
              releaseMode: 'STAGED',
              stagedFromPlanningListId: stagingPlanningListId,
              scheduledReleaseDate: scheduledReleaseDate.toISOString(),
              releaseTargetListId,
              releasedAt: null,
            },
          },
          select: { id: true },
        })).id;

        previousTaskIdByChain.set(chainKey, createdTaskId);
        createdTasks.push({ id: createdTaskId });
      }

      const createdCards = await tx.card.findMany({
        where: {
          id: {
            in: [epicId, userStory.id, ...createdTasks.map((t) => t.id)],
          },
        },
        include: {
          list: {
            select: {
              id: true,
              name: true,
              phase: true,
            },
          },
          assignees: {
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
          _count: {
            select: {
              attachments: true,
              comments: true,
            },
          },
          checklists: {
            include: {
              items: true,
            },
          },
        },
      });

      return createdCards;
    });

    return apiSuccess({ created });
  } catch (error) {
    console.error('Failed to apply module:', error);

    if (error instanceof Error && error.message.includes('Invalid')) {
      return ApiErrors.validation(error.message);
    }

    if (error instanceof Error && error.message.includes('must have a start date')) {
      return ApiErrors.validation(error.message);
    }

    return ApiErrors.internal('Failed to apply module');
  }
}
