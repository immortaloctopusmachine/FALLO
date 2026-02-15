import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { requireQualitySummaryAccess, toRoundedNumber } from '@/lib/quality-review-api';
import { buildFinalQualitySummaryByCardId } from '@/lib/quality-metrics';
import { qualityTierFromAverage } from '@/lib/quality-review';

// GET /api/metrics/teams/[teamId]/quality-summary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireQualitySummaryAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { teamId } = await params;

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!team) {
      return ApiErrors.notFound('Team');
    }

    const projects = await prisma.board.findMany({
      where: {
        teamId,
        archivedAt: null,
        isTemplate: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const doneTasks = await prisma.card.findMany({
      where: {
        archivedAt: null,
        type: 'TASK',
        list: {
          phase: 'DONE',
          board: {
            teamId,
            archivedAt: null,
            isTemplate: false,
          },
        },
      },
      select: {
        id: true,
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    const finalQualityByCardId = await buildFinalQualitySummaryByCardId(
      prisma,
      doneTasks.map((task) => task.id)
    );

    const byProjectId = new Map(
      projects.map((project) => [
        project.id,
        {
          projectId: project.id,
          projectName: project.name,
          doneTaskCount: 0,
          finalizedTaskCount: 0,
          qualitySum: 0,
          qualityCount: 0,
        },
      ])
    );

    for (const task of doneTasks) {
      const aggregate = byProjectId.get(task.list.boardId);
      if (!aggregate) continue;

      aggregate.doneTaskCount += 1;

      const finalQuality = finalQualityByCardId.get(task.id);
      if (!finalQuality) continue;

      aggregate.finalizedTaskCount += 1;
      if (finalQuality.overallAverage !== null) {
        aggregate.qualitySum += finalQuality.overallAverage;
        aggregate.qualityCount += 1;
      }
    }

    const projectSummaries = Array.from(byProjectId.values()).map((aggregate) => {
      const overallAverage =
        aggregate.qualityCount > 0 ? aggregate.qualitySum / aggregate.qualityCount : null;

      return {
        projectId: aggregate.projectId,
        projectName: aggregate.projectName,
        doneTaskCount: aggregate.doneTaskCount,
        finalizedTaskCount: aggregate.finalizedTaskCount,
        coveragePct:
          aggregate.doneTaskCount > 0
            ? toRoundedNumber((aggregate.finalizedTaskCount / aggregate.doneTaskCount) * 100)
            : null,
        overallAverage: toRoundedNumber(overallAverage),
        overallQualityTier: qualityTierFromAverage(overallAverage),
      };
    });

    const totals = projectSummaries.reduce(
      (acc, project) => {
        acc.doneTaskCount += project.doneTaskCount;
        acc.finalizedTaskCount += project.finalizedTaskCount;
        if (project.overallAverage !== null && project.finalizedTaskCount > 0) {
          acc.qualitySum += project.overallAverage * project.finalizedTaskCount;
          acc.qualityCount += project.finalizedTaskCount;
        }
        return acc;
      },
      {
        doneTaskCount: 0,
        finalizedTaskCount: 0,
        qualitySum: 0,
        qualityCount: 0,
      }
    );

    const overallAverage = totals.qualityCount > 0 ? totals.qualitySum / totals.qualityCount : null;

    return apiSuccess({
      team: {
        id: team.id,
        name: team.name,
      },
      totals: {
        projectCount: projectSummaries.length,
        doneTaskCount: totals.doneTaskCount,
        finalizedTaskCount: totals.finalizedTaskCount,
        overallAverage: toRoundedNumber(overallAverage),
        overallQualityTier: qualityTierFromAverage(overallAverage),
      },
      projects: projectSummaries,
    });
  } catch (error) {
    console.error('Failed to fetch team quality summary:', error);
    return ApiErrors.internal('Failed to fetch team quality summary');
  }
}

