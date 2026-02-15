import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { requireQualitySummaryAccess, toRoundedNumber } from '@/lib/quality-review-api';
import { buildFinalQualitySummaryByCardId } from '@/lib/quality-metrics';
import { qualityTierFromAverage } from '@/lib/quality-review';

// GET /api/metrics/studios/[studioId]/quality-summary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireQualitySummaryAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const { studioId } = await params;

    const studio = await prisma.studio.findFirst({
      where: {
        id: studioId,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!studio) {
      return ApiErrors.notFound('Studio');
    }

    const projects = await prisma.board.findMany({
      where: {
        archivedAt: null,
        isTemplate: false,
        team: {
          studioId,
          archivedAt: null,
        },
      },
      select: {
        id: true,
        name: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
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
            archivedAt: null,
            isTemplate: false,
            team: {
              studioId,
              archivedAt: null,
            },
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
          teamId: project.team?.id ?? null,
          teamName: project.team?.name ?? null,
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

    const projectSummaries = Array.from(byProjectId.values())
      .map((aggregate) => {
        const overallAverage =
          aggregate.qualityCount > 0 ? aggregate.qualitySum / aggregate.qualityCount : null;

        return {
          projectId: aggregate.projectId,
          projectName: aggregate.projectName,
          teamId: aggregate.teamId,
          teamName: aggregate.teamName,
          doneTaskCount: aggregate.doneTaskCount,
          finalizedTaskCount: aggregate.finalizedTaskCount,
          coveragePct:
            aggregate.doneTaskCount > 0
              ? toRoundedNumber((aggregate.finalizedTaskCount / aggregate.doneTaskCount) * 100)
              : null,
          overallAverage: toRoundedNumber(overallAverage),
          overallQualityTier: qualityTierFromAverage(overallAverage),
        };
      })
      .sort((a, b) => {
        const teamA = a.teamName ?? '';
        const teamB = b.teamName ?? '';
        if (teamA !== teamB) return teamA.localeCompare(teamB);
        return a.projectName.localeCompare(b.projectName);
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
      studio: {
        id: studio.id,
        name: studio.name,
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
    console.error('Failed to fetch studio quality summary:', error);
    return ApiErrors.internal('Failed to fetch studio quality summary');
  }
}

