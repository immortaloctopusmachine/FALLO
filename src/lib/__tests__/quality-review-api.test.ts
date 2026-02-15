import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluatorRole } from '@prisma/client';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    boardMember: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  buildCycleAggregateSummary,
  getApplicableReviewDimensionsForCard,
  requireEvaluatorAccess,
  requireNonViewerQualityAccess,
  requireQualitySummaryAccess,
  requireSuperAdminQualityAccess,
  type ReviewDimensionWithRelations,
} from '../quality-review-api';

function makeDimension(params: {
  id: string;
  name: string;
  position: number;
  roles: EvaluatorRole[];
}): ReviewDimensionWithRelations {
  return {
    id: params.id,
    name: params.name,
    description: null,
    position: params.position,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    dimensionRoles: params.roles.map((role, index) => ({
      id: `${params.id}-role-${index}`,
      role,
      dimensionId: params.id,
    })),
  } as ReviewDimensionWithRelations;
}

describe('quality-review-api access', () => {
  let db: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    db = {
      user: {
        findUnique: vi.fn(),
      },
    };
  });

  it('blocks viewer users from quality score visibility access', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'viewer-1',
      permission: 'VIEWER',
      userCompanyRoles: [{ companyRole: { name: 'Product Owner' } }],
    });

    const result = await requireNonViewerQualityAccess(
      db as unknown as Parameters<typeof requireNonViewerQualityAccess>[0],
      'viewer-1'
    );

    expect(result.response?.status).toBe(403);
    expect(result.access).toBeUndefined();
  });

  it('requires super admin for review-question settings access', async () => {
    db.user.findUnique.mockResolvedValueOnce({
      id: 'admin-1',
      permission: 'ADMIN',
      userCompanyRoles: [{ companyRole: { name: 'Lead Artist' } }],
    });

    const denied = await requireSuperAdminQualityAccess(
      db as unknown as Parameters<typeof requireSuperAdminQualityAccess>[0],
      'admin-1'
    );

    expect(denied.response?.status).toBe(403);
    expect(denied.access).toBeUndefined();

    db.user.findUnique.mockResolvedValueOnce({
      id: 'super-1',
      permission: 'SUPER_ADMIN',
      userCompanyRoles: [{ companyRole: { name: 'Lead Artist' } }],
    });

    const allowed = await requireSuperAdminQualityAccess(
      db as unknown as Parameters<typeof requireSuperAdminQualityAccess>[0],
      'super-1'
    );

    expect(allowed.response).toBeUndefined();
    expect(allowed.access).toMatchObject({
      userId: 'super-1',
      permission: 'SUPER_ADMIN',
      evaluatorRoles: ['LEAD'],
    });
  });

  it('checks evaluator eligibility by role, not admin permission', async () => {
    db.user.findUnique.mockResolvedValueOnce({
      id: 'admin-no-role',
      permission: 'ADMIN',
      userCompanyRoles: [{ companyRole: { name: 'Administrator' } }],
    });

    const denied = await requireEvaluatorAccess(
      db as unknown as Parameters<typeof requireEvaluatorAccess>[0],
      'admin-no-role'
    );

    expect(denied.response?.status).toBe(403);
    expect(denied.access).toBeUndefined();

    db.user.findUnique.mockResolvedValueOnce({
      id: 'member-lead',
      permission: 'MEMBER',
      userCompanyRoles: [{ companyRole: { name: 'Lead Artist' } }],
    });

    const allowed = await requireEvaluatorAccess(
      db as unknown as Parameters<typeof requireEvaluatorAccess>[0],
      'member-lead'
    );

    expect(allowed.response).toBeUndefined();
    expect(allowed.access).toMatchObject({
      userId: 'member-lead',
      permission: 'MEMBER',
      evaluatorRoles: ['LEAD'],
    });
  });

  it('allows quality summary visibility only for lead/po/head-of-art roles', async () => {
    db.user.findUnique.mockResolvedValueOnce({
      id: 'admin-no-role',
      permission: 'ADMIN',
      userCompanyRoles: [{ companyRole: { name: 'Administrator' } }],
    });

    const denied = await requireQualitySummaryAccess(
      db as unknown as Parameters<typeof requireQualitySummaryAccess>[0],
      'admin-no-role'
    );

    expect(denied.response?.status).toBe(403);
    expect(denied.access).toBeUndefined();

    db.user.findUnique.mockResolvedValueOnce({
      id: 'member-hoa',
      permission: 'MEMBER',
      userCompanyRoles: [{ companyRole: { name: 'Head of Art' } }],
    });

    const allowed = await requireQualitySummaryAccess(
      db as unknown as Parameters<typeof requireQualitySummaryAccess>[0],
      'member-hoa'
    );

    expect(allowed.response).toBeUndefined();
    expect(allowed.access).toMatchObject({
      userId: 'member-hoa',
      evaluatorRoles: ['HEAD_OF_ART'],
    });
  });
});

describe('quality-review-api aggregation helpers', () => {
  it('filters applicable dimensions by evaluator role', async () => {
    const preloadedDimensions: ReviewDimensionWithRelations[] = [
      makeDimension({
        id: 'dim-lead',
        name: 'Technical Quality',
        position: 1,
        roles: ['LEAD'],
      }),
      makeDimension({
        id: 'dim-po',
        name: 'Context Fit',
        position: 2,
        roles: ['PO'],
      }),
      makeDimension({
        id: 'dim-both',
        name: 'Delivery',
        position: 3,
        roles: [],
      }),
    ];

    const card = {
      id: 'card-1',
      title: 'Task',
      type: 'TASK',
      taskData: null,
      list: {
        id: 'list-1',
        name: 'Doing',
        phase: 'PRODUCTION',
        boardId: 'board-1',
        viewType: 'TASKS',
      },
    };

    const db = {
      card: {
        findFirst: vi.fn(),
      },
      reviewDimension: {
        findMany: vi.fn(),
      },
    };

    const leadView = await getApplicableReviewDimensionsForCard(
      db as unknown as Parameters<typeof getApplicableReviewDimensionsForCard>[0],
      card,
      ['LEAD'],
      preloadedDimensions
    );

    expect(leadView.map((dimension) => dimension.id)).toEqual([
      'dim-lead',
      'dim-both',
    ]);

    const headOfArtView = await getApplicableReviewDimensionsForCard(
      db as unknown as Parameters<typeof getApplicableReviewDimensionsForCard>[0],
      card,
      ['HEAD_OF_ART'],
      preloadedDimensions
    );

    expect(headOfArtView.map((dimension) => dimension.id)).toEqual([
      'dim-lead',
      'dim-po',
      'dim-both',
    ]);
  });

  it('builds anonymized cycle aggregates with divergence flags', () => {
    const dimensions: ReviewDimensionWithRelations[] = [
      makeDimension({
        id: 'dim-tech',
        name: 'Technical Quality',
        position: 1,
        roles: ['LEAD', 'PO'],
      }),
      makeDimension({
        id: 'dim-delivery',
        name: 'Delivery',
        position: 2,
        roles: ['LEAD', 'PO'],
      }),
    ];

    const cycleSummary = buildCycleAggregateSummary({
      cycle: {
        id: 'cycle-1',
        cycleNumber: 3,
        openedAt: new Date('2026-01-05T09:00:00.000Z'),
        closedAt: new Date('2026-01-05T10:00:00.000Z'),
        isFinal: true,
        lockedAt: new Date('2026-01-06T09:00:00.000Z'),
        evaluations: [
          {
            reviewerId: 'lead-1',
            scores: [
              { dimensionId: 'dim-tech', score: 'HIGH' },
              { dimensionId: 'dim-delivery', score: 'MEDIUM' },
            ],
          },
          {
            reviewerId: 'po-1',
            scores: [
              { dimensionId: 'dim-tech', score: 'LOW' },
              { dimensionId: 'dim-delivery', score: 'MEDIUM' },
            ],
          },
          {
            reviewerId: 'hoa-1',
            scores: [{ dimensionId: 'dim-tech', score: 'HIGH' }],
          },
        ],
      },
      dimensions,
      reviewerRolesByUserId: new Map([
        ['lead-1', ['LEAD']],
        ['po-1', ['PO']],
        ['hoa-1', ['HEAD_OF_ART']],
      ]),
      divergenceThreshold: 2,
    });

    expect(cycleSummary.evaluationsCount).toBe(3);
    expect(cycleSummary.overallAverage).toBeCloseTo(2.1667, 3);
    expect(cycleSummary.qualityTier).toBe('MEDIUM');

    expect(cycleSummary.dimensions).toEqual([
      {
        dimensionId: 'dim-tech',
        name: 'Technical Quality',
        description: null,
        position: 1,
        average: expect.closeTo(2.3333, 3),
        scoreLabel: 'MEDIUM',
        count: 3,
        confidence: 'RED',
      },
      {
        dimensionId: 'dim-delivery',
        name: 'Delivery',
        description: null,
        position: 2,
        average: 2,
        scoreLabel: 'MEDIUM',
        count: 2,
        confidence: 'RED',
      },
    ]);

    expect(cycleSummary.divergenceFlags).toEqual(
      expect.arrayContaining([
        {
          dimensionId: 'dim-tech',
          dimensionName: 'Technical Quality',
          roleA: 'LEAD',
          roleB: 'PO',
          averageA: 3,
          averageB: 1,
          difference: 2,
        },
        {
          dimensionId: 'dim-tech',
          dimensionName: 'Technical Quality',
          roleA: 'PO',
          roleB: 'HEAD_OF_ART',
          averageA: 1,
          averageB: 3,
          difference: 2,
        },
      ])
    );
  });
});
