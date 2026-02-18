import { prisma } from '@/lib/prisma';
import { isSlackConfigured, postSlackMessage } from '@/lib/slack';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-utils';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  const tokenFromAuth = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  const tokenFromHeader = request.headers.get('x-cron-secret');

  return tokenFromAuth === secret || tokenFromHeader === secret;
}

function isTaskComplete(task: {
  listId: string;
  checklists: { items: { isComplete: boolean }[] }[];
}, doneListId: string | null): boolean {
  if (doneListId && task.listId === doneListId) return true;
  const checklistItems = task.checklists?.flatMap((cl) => cl.items) || [];
  return checklistItems.length > 0 && checklistItems.every((item) => item.isComplete);
}

async function handleCronRequest(request: Request) {
  if (!process.env.CRON_SECRET) {
    return ApiErrors.internal('CRON_SECRET environment variable is not configured');
  }

  if (!isAuthorized(request)) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  if (!isSlackConfigured()) {
    return apiSuccess({ sent: 0, skipped: 0, reason: 'SLACK_BOT_TOKEN not configured' });
  }

  try {
    const boards = await prisma.board.findMany({
      where: { archivedAt: null, isTemplate: false },
      select: {
        id: true,
        name: true,
        settings: true,
        lists: {
          select: {
            id: true,
            viewType: true,
            phase: true,
            cards: {
              where: { archivedAt: null, type: 'TASK' },
              select: {
                id: true,
                listId: true,
                taskData: true,
                checklists: {
                  select: {
                    items: {
                      select: {
                        isComplete: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        weeklyProgress: {
          orderBy: { weekStartDate: 'asc' },
          take: 2,
          select: {
            weekStartDate: true,
            completedPoints: true,
            tasksCompleted: true,
            tasksTotal: true,
          },
        },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const board of boards) {
      const settings = (board.settings as Record<string, unknown>) || {};
      const channelId = typeof settings.slackChannelId === 'string' ? settings.slackChannelId.trim() : '';
      const alertsEnabled = settings.slackAlertsEnabled !== false;
      const slowThreshold = typeof settings.slackSlowProgressThresholdPct === 'number'
        ? settings.slackSlowProgressThresholdPct
        : 50;

      if (!alertsEnabled || !channelId) {
        skipped += 1;
        continue;
      }

      const doneListId =
        board.lists.find((list) => list.viewType === 'TASKS' && list.phase === 'DONE')?.id || null;
      const tasks = board.lists.flatMap((list) => list.cards);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => isTaskComplete(task, doneListId)).length;

      const totalStoryPoints = tasks.reduce((sum, task) => {
        const taskData = task.taskData as { storyPoints?: number } | null;
        return sum + (taskData?.storyPoints || 0);
      }, 0);
      const completedStoryPoints = tasks.reduce((sum, task) => {
        const taskData = task.taskData as { storyPoints?: number } | null;
        if (!isTaskComplete(task, doneListId)) return sum;
        return sum + (taskData?.storyPoints || 0);
      }, 0);

      const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const slowProgress = completionPct < slowThreshold;

      const weekly = board.weeklyProgress;
      const latest = weekly[weekly.length - 1];
      const previous = weekly.length > 1 ? weekly[weekly.length - 2] : null;
      const weeklyDeltaPoints = latest && previous ? latest.completedPoints - previous.completedPoints : null;

      const statusPrefix = slowProgress ? ':warning: Slow progress detected' : ':white_check_mark: Weekly project summary';
      const message = [
        `${statusPrefix} for *${board.name}*`,
        `Tasks: *${completedTasks}/${totalTasks}* (${completionPct}%)`,
        `Story points: *${completedStoryPoints}/${totalStoryPoints}*`,
        weeklyDeltaPoints !== null ? `Weekly completed points delta: *${weeklyDeltaPoints >= 0 ? '+' : ''}${weeklyDeltaPoints}*` : 'Weekly delta: n/a',
      ].join('\n');

      await postSlackMessage(channelId, message);
      sent += 1;
    }

    return apiSuccess({ sent, skipped });
  } catch (error) {
    console.error('Slack project summaries cron failed:', error);
    return ApiErrors.internal('Failed to send Slack project summaries');
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
