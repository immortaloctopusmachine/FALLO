'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SeniorityConfig {
  id: string;
  seniority: 'JUNIOR' | 'MID' | 'SENIOR';
  expectedPointsPerWeek: number;
  expectedQualityAvg: number;
  warmUpPoints: number;
  steadyHandRatio: number;
  inTheFlowRatio: number;
  onARollRatio: number;
  powerhouseRatio: number;
  forceOfNatureRatio: number;
  updatedAt: string;
}

interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: string | null;
  iconUrl: string | null;
  conditions: unknown;
}

interface UserPickerOption {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface RewardsOverview {
  summary: {
    badgeDefinitions: number;
    badgeAwards: number;
    weeklySnapshots: number;
    activeStreaks: number;
    latestSnapshotWeek: string | null;
  };
  filters: {
    userId: string | null;
    badgeCategory: string | null;
    streakType: string | null;
    startWeekDate: string | null;
    endWeekDate: string | null;
    limit: number;
  };
  availableFilters: {
    badgeCategories: string[];
    streakTypes: Array<{
      value: string;
      label: string;
      description: string;
    }>;
  };
  recentSnapshots: Array<{
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    storyPointsCompleted: number;
    cardsCompleted: number;
    avgQualityScore: number | null;
    evaluationsSubmitted: number;
    evaluationRate: number | null;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      seniority: string | null;
    };
  }>;
  recentAwards: Array<{
    id: string;
    awardedAt: string;
    metadata: unknown;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    badge: {
      id: string;
      slug: string;
      name: string;
      description: string;
      category: string;
      tier: string | null;
    };
    triggerSnapshotWeek: string | null;
  }>;
  activeStreaks: Array<{
    id: string;
    streakType: string;
    label: string;
    description: string;
    currentCount: number;
    longestCount: number;
    lastQualifiedWeek: string | null;
    graceUsed: boolean;
    isActive: boolean;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
}

interface RewardsUserHistory {
  user: {
    id: string;
    name: string | null;
    email: string;
    seniority: string | null;
    image: string | null;
  };
  filters: {
    startWeekDate: string | null;
    endWeekDate: string | null;
    limit: number;
  };
  summary: {
    totalSnapshots: number;
    returnedSnapshots: number;
    averagePointsPerSnapshot: number | null;
    averageQualityScore: number | null;
    firstSnapshotWeek: string | null;
    latestSnapshotWeek: string | null;
  };
  activeStreaks: Array<{
    id: string;
    streakType: string;
    label: string;
    description: string;
    currentCount: number;
    longestCount: number;
    lastQualifiedWeek: string | null;
    graceUsed: boolean;
    isActive: boolean;
  }>;
  snapshots: Array<{
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    seniorityAtSnapshot: string | null;
    storyPointsCompleted: number;
    cardsCompleted: number;
    avgQualityScore: number | null;
    avgTechnicalQuality: number | null;
    avgArtDirection: number | null;
    avgContextFit: number | null;
    avgDelivery: number | null;
    scoredCardCount: number;
    firstPassCount: number;
    firstPassRate: number | null;
    avgReviewCycles: number | null;
    evaluationsSubmitted: number;
    evaluationEligible: number;
    evaluationRate: number | null;
    createdAt: string;
    badgeAwards: Array<{
      id: string;
      awardedAt: string;
      metadata: unknown;
      badge: {
        id: string;
        slug: string;
        name: string;
        description: string;
        category: string;
        tier: string | null;
      };
    }>;
  }>;
}

type EditableConfigState = Omit<SeniorityConfig, 'id' | 'updatedAt'>;
type RewardsOverviewFilters = {
  userId: string;
  badgeCategory: string;
  streakType: string;
  startWeekDate: string;
  endWeekDate: string;
};

type BadgeCatalogFilters = {
  search: string;
  category: string;
};

const SENIORITY_LABELS: Record<SeniorityConfig['seniority'], string> = {
  JUNIOR: 'Junior',
  MID: 'Mid',
  SENIOR: 'Senior',
};

const NUMERIC_FIELDS: Array<{
  key: keyof EditableConfigState;
  label: string;
  step: string;
  help: string;
}> = [
  {
    key: 'expectedPointsPerWeek',
    label: 'Expected points / week',
    step: '0.1',
    help: 'Baseline weekly output used for velocity-relative badges.',
  },
  {
    key: 'expectedQualityAvg',
    label: 'Expected quality average',
    step: '0.1',
    help: 'Baseline final quality score used for quality consistency badges.',
  },
  {
    key: 'warmUpPoints',
    label: 'Warm-Up points',
    step: '0.1',
    help: 'Flat point threshold for the Warm-Up weekly streak.',
  },
  {
    key: 'steadyHandRatio',
    label: 'Steady Hand ratio',
    step: '0.1',
    help: 'Multiplier of expected points for Steady Hand streaks.',
  },
  {
    key: 'inTheFlowRatio',
    label: 'In the Flow ratio',
    step: '0.1',
    help: 'Multiplier of expected points for In the Flow streaks.',
  },
  {
    key: 'onARollRatio',
    label: 'On a Roll ratio',
    step: '0.1',
    help: 'Multiplier of expected points for On a Roll streaks.',
  },
  {
    key: 'powerhouseRatio',
    label: 'Powerhouse ratio',
    step: '0.1',
    help: 'Multiplier of expected points for Powerhouse streaks.',
  },
  {
    key: 'forceOfNatureRatio',
    label: 'Force of Nature ratio',
    step: '0.1',
    help: 'Multiplier of expected points for Force of Nature streaks.',
  },
];

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function formatNumber(value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function buildBadgeConditionSummary(definition: BadgeDefinition): string[] {
  const conditions = asRecord(definition.conditions);
  if (!conditions) {
    return ['No structured condition metadata found.'];
  }

  const family = typeof conditions.family === 'string' ? conditions.family : null;
  const streakWeeks = formatNumber(conditions.streakWeeks);
  const milestoneDays = formatNumber(conditions.milestoneDays);
  const expectedPointsMultiplier = formatNumber(conditions.expectedPointsMultiplier);
  const velocityRatio = formatNumber(conditions.velocityRatio);
  const deltaAboveExpected = formatNumber(conditions.deltaAboveExpected);
  const totalReviews = formatNumber(conditions.totalReviews);
  const evaluationRate = typeof conditions.evaluationRate === 'number'
    ? `${Math.round(conditions.evaluationRate * 100)}%`
    : null;
  const consensusRate = typeof conditions.consensusRate === 'number'
    ? `${Math.round(conditions.consensusRate * 100)}%`
    : null;
  const consensusTolerance = formatNumber(conditions.consensusTolerance);

  switch (family) {
    case 'login_streak':
      return [
        'Behavior: one-time login milestone.',
        `Awarded at ${milestoneDays ?? '?'} consecutive daily logins.`,
      ];
    case 'login_total_days':
      return [
        'Behavior: one-time login milestone.',
        `Awarded at ${milestoneDays ?? '?'} total login days.`,
      ];
    case 'velocity_streak': {
      const velocityTier = typeof conditions.velocityTier === 'string'
        ? formatLabel(conditions.velocityTier)
        : 'Unknown tier';
      const thresholdType = conditions.thresholdType === 'flat_points'
        ? `${formatNumber(conditions.thresholdValue) ?? '?'} weekly story points`
        : `${formatNumber(conditions.thresholdValue) ?? '?'}x expected weekly points for the user seniority`;

      return [
        'Behavior: re-earnable streak milestone.',
        `Awarded after ${streakWeeks ?? '?'} consecutive qualifying weeks in ${velocityTier}.`,
        `Qualification threshold: ${thresholdType}.`,
      ];
    }
    case 'velocity_milestone':
      return [
        'Behavior: one-time weekly milestone.',
        `Awarded for a week at ${expectedPointsMultiplier ?? '?'}x expected weekly points for the user seniority.`,
      ];
    case 'quality_consistency':
      return [
        'Behavior: re-earnable streak milestone.',
        `Awarded after ${streakWeeks ?? '?'} consecutive weeks at ${
          deltaAboveExpected && deltaAboveExpected !== '0'
            ? `expected quality + ${deltaAboveExpected}`
            : 'expected quality'
        }.`,
      ];
    case 'quality_velocity_combined':
      return [
        'Behavior: re-earnable streak milestone.',
        `Awarded after ${streakWeeks ?? '?'} consecutive weeks with velocity at ${velocityRatio ?? '?'}x expected.`,
        `Quality requirement: ${
          deltaAboveExpected && deltaAboveExpected !== '0'
            ? `expected quality + ${deltaAboveExpected}`
            : 'expected quality'
        }.`,
      ];
    case 'reviewer': {
      if (totalReviews) {
        const consensusLine = consensusRate
          ? `Consensus requirement: ${consensusRate} alignment within ${consensusTolerance ?? '?'} average-score points across comparable reviews.`
          : null;

        return [
          'Behavior: one-time reviewer milestone.',
          `Awarded after ${totalReviews} submitted reviews.`,
          ...(consensusLine ? [consensusLine] : []),
        ];
      }

      return [
        'Behavior: re-earnable reviewer streak milestone.',
        `Awarded after ${streakWeeks ?? '?'} consecutive weeks with ${evaluationRate ?? '?'} review completion on assigned opportunities.`,
      ];
    }
    default:
      return [
        `Condition family: ${family ?? 'unknown'}.`,
        'Reward logic is currently code-driven; this payload is metadata for display and debugging.',
      ];
  }
}

function ScrollSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`h-full overflow-y-auto pr-1 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function RewardsSettingsClient() {
  const [configs, setConfigs] = useState<SeniorityConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditableConfigState>>({});
  const [expandedConfigs, setExpandedConfigs] = useState<Record<string, boolean>>({
    JUNIOR: false,
    MID: false,
    SENIOR: false,
  });
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>([]);
  const [expandedBadgeIds, setExpandedBadgeIds] = useState<Record<string, boolean>>({});
  const [badgeCatalogFilters, setBadgeCatalogFilters] = useState<BadgeCatalogFilters>({
    search: '',
    category: '',
  });
  const [userOptions, setUserOptions] = useState<UserPickerOption[]>([]);
  const [overview, setOverview] = useState<RewardsOverview | null>(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState<RewardsUserHistory | null>(null);
  const [filterDraft, setFilterDraft] = useState<RewardsOverviewFilters>({
    userId: '',
    badgeCategory: '',
    streakType: '',
    startWeekDate: '',
    endWeekDate: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<RewardsOverviewFilters>({
    userId: '',
    badgeCategory: '',
    streakType: '',
    startWeekDate: '',
    endWeekDate: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingBadgeId, setSavingBadgeId] = useState<string | null>(null);
  const [pendingBadgeUploadId, setPendingBadgeUploadId] = useState<string | null>(null);
  const badgeUploadInputRef = useRef<HTMLInputElement | null>(null);

  const buildOverviewUrl = useCallback((filters: RewardsOverviewFilters) => {
    const searchParams = new URLSearchParams({ limit: '12' });
    if (filters.userId) searchParams.set('userId', filters.userId);
    if (filters.badgeCategory) searchParams.set('badgeCategory', filters.badgeCategory);
    if (filters.streakType) searchParams.set('streakType', filters.streakType);
    if (filters.startWeekDate) searchParams.set('startWeekDate', filters.startWeekDate);
    if (filters.endWeekDate) searchParams.set('endWeekDate', filters.endWeekDate);
    return `/api/admin/rewards/overview?${searchParams.toString()}`;
  }, []);

  const buildUserHistoryUrl = useCallback((filters: RewardsOverviewFilters) => {
    if (!filters.userId) return null;

    const searchParams = new URLSearchParams({ limit: '24' });
    if (filters.startWeekDate) searchParams.set('startWeekDate', filters.startWeekDate);
    if (filters.endWeekDate) searchParams.set('endWeekDate', filters.endWeekDate);
    return `/api/admin/rewards/users/${filters.userId}/history?${searchParams.toString()}`;
  }, []);

  const loadData = useCallback(async (filters: RewardsOverviewFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const userHistoryUrl = buildUserHistoryUrl(filters);
      const [seniorityConfigs, badges, users, rewardsOverview, rewardsUserHistory] = await Promise.all([
        apiFetch<SeniorityConfig[]>('/api/admin/seniority-config'),
        apiFetch<BadgeDefinition[]>('/api/badges'),
        apiFetch<UserPickerOption[]>('/api/users?scope=picker'),
        apiFetch<RewardsOverview>(buildOverviewUrl(filters)),
        userHistoryUrl ? apiFetch<RewardsUserHistory>(userHistoryUrl) : Promise.resolve(null),
      ]);

      setConfigs(seniorityConfigs);
      setDrafts(
        Object.fromEntries(
          seniorityConfigs.map((config) => [
            config.seniority,
            {
              seniority: config.seniority,
              expectedPointsPerWeek: config.expectedPointsPerWeek,
              expectedQualityAvg: config.expectedQualityAvg,
              warmUpPoints: config.warmUpPoints,
              steadyHandRatio: config.steadyHandRatio,
              inTheFlowRatio: config.inTheFlowRatio,
              onARollRatio: config.onARollRatio,
              powerhouseRatio: config.powerhouseRatio,
              forceOfNatureRatio: config.forceOfNatureRatio,
            },
          ])
        )
      );
      setBadgeDefinitions(badges);
      setUserOptions(users);
      setOverview(rewardsOverview);
      setSelectedUserHistory(rewardsUserHistory);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load rewards settings');
    } finally {
      setIsLoading(false);
    }
  }, [buildOverviewUrl, buildUserHistoryUrl]);

  useEffect(() => {
    void loadData(appliedFilters);
  }, [appliedFilters, loadData]);

  const badgeCountsByCategory = useMemo(() => {
    return badgeDefinitions.reduce<Record<string, number>>((acc, definition) => {
      acc[definition.category] = (acc[definition.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [badgeDefinitions]);

  const selectedUserLabel = useMemo(() => {
    if (!overview?.filters.userId) return null;

    const matchingUser = userOptions.find((user) => user.id === overview.filters.userId);
    return matchingUser?.name || matchingUser?.email || overview.filters.userId;
  }, [overview?.filters.userId, userOptions]);

  const selectedBadgeCategoryLabel = useMemo(() => {
    if (!overview?.filters.badgeCategory) return null;
    return overview.filters.badgeCategory.replaceAll('_', ' ');
  }, [overview?.filters.badgeCategory]);

  const selectedStreakTypeLabel = useMemo(() => {
    if (!overview?.filters.streakType) return null;

    return overview.availableFilters.streakTypes.find(
      (streak) => streak.value === overview.filters.streakType
    )?.label ?? overview.filters.streakType;
  }, [overview]);

  const filteredBadgeDefinitions = useMemo(() => {
    const search = badgeCatalogFilters.search.trim().toLowerCase();

    return badgeDefinitions.filter((definition) => {
      const matchesCategory = !badgeCatalogFilters.category
        || definition.category === badgeCatalogFilters.category;
      const matchesSearch = !search
        || definition.name.toLowerCase().includes(search)
        || definition.slug.toLowerCase().includes(search)
        || definition.description.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [badgeCatalogFilters, badgeDefinitions]);

  const updateDraftField = (
    seniority: SeniorityConfig['seniority'],
    field: keyof EditableConfigState,
    value: number
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [seniority]: {
        ...(prev[seniority] ?? { seniority }),
        [field]: value,
      },
    }));
  };

  const toggleConfigSection = (seniority: SeniorityConfig['seniority']) => {
    setExpandedConfigs((prev) => ({
      ...prev,
      [seniority]: !prev[seniority],
    }));
  };

  const toggleBadgeSection = (badgeId: string) => {
    setExpandedBadgeIds((prev) => ({
      ...prev,
      [badgeId]: !prev[badgeId],
    }));
  };

  const handleSave = async (seniority: SeniorityConfig['seniority']) => {
    const draft = drafts[seniority];
    if (!draft) return;

    setSavingKey(seniority);
    try {
      const response = await fetch(`/api/admin/seniority-config/${seniority}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedPointsPerWeek: draft.expectedPointsPerWeek,
          expectedQualityAvg: draft.expectedQualityAvg,
          warmUpPoints: draft.warmUpPoints,
          steadyHandRatio: draft.steadyHandRatio,
          inTheFlowRatio: draft.inTheFlowRatio,
          onARollRatio: draft.onARollRatio,
          powerhouseRatio: draft.powerhouseRatio,
          forceOfNatureRatio: draft.forceOfNatureRatio,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || `Failed to update ${seniority.toLowerCase()} config`);
      }

      await loadData(appliedFilters);
    } catch (saveError) {
      alert(saveError instanceof Error ? saveError.message : 'Failed to save rewards config');
    } finally {
      setSavingKey(null);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filterDraft);
  };

  const handleClearFilters = () => {
    const cleared = {
      userId: '',
      badgeCategory: '',
      streakType: '',
      startWeekDate: '',
      endWeekDate: '',
    };
    setFilterDraft(cleared);
    setAppliedFilters(cleared);
  };

  const persistBadgeIcon = useCallback(async (badgeId: string, iconUrl: string | null) => {
    setSavingBadgeId(badgeId);

    try {
      const response = await fetch(`/api/admin/badges/${badgeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iconUrl,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || 'Failed to update badge art');
      }

      setBadgeDefinitions((prev) => (
        prev.map((badge) => (
          badge.id === badgeId
            ? { ...badge, iconUrl: payload.data.iconUrl }
            : badge
        ))
      ));
    } catch (saveError) {
      alert(saveError instanceof Error ? saveError.message : 'Failed to update badge art');
    } finally {
      setSavingBadgeId(null);
    }
  }, []);

  const handleBadgeUploadSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const badgeId = pendingBadgeUploadId;
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setPendingBadgeUploadId(null);

    if (!badgeId || !file) {
      return;
    }

    setSavingBadgeId(badgeId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadPayload = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadPayload.success) {
        throw new Error(uploadPayload.error?.message || 'Badge image upload failed');
      }

      await persistBadgeIcon(badgeId, uploadPayload.data.url as string);
    } catch (uploadError) {
      alert(uploadError instanceof Error ? uploadError.message : 'Failed to upload badge art');
      setSavingBadgeId(null);
    }
  };

  const handleBadgeUploadTrigger = (badgeId: string) => {
    setPendingBadgeUploadId(badgeId);
    badgeUploadInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-secondary">Loading rewards settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-body text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={badgeUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleBadgeUploadSelected(event)}
      />

      <div className="space-y-2">
        <h2 className="text-title font-semibold">Rewards</h2>
        <p className="text-body text-text-secondary">
          Configure seniority-relative reward thresholds for weekly badge evaluation.
          Login badges are fixed. Weekly velocity and quality badges use these values.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-surface p-1 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="catalog">Badge Catalog</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
          <TabsTrigger value="history">User History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 h-[calc(100vh-16rem)] min-h-[32rem] overflow-hidden">
          <ScrollSection className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-caption text-text-secondary">Badge Definitions</div>
                <div className="mt-2 text-2xl font-semibold text-text-primary">{badgeDefinitions.length}</div>
                <div className="mt-2 text-caption text-text-tertiary">
                  Seeded MVP badge definitions currently available in the app.
                </div>
              </div>
              {Object.entries(badgeCountsByCategory).map(([category, count]) => (
                <div key={category} className="rounded-lg border border-border bg-surface p-4">
                  <div className="text-caption text-text-secondary">{category.replaceAll('_', ' ')}</div>
                  <div className="mt-2 text-2xl font-semibold text-text-primary">{count}</div>
                </div>
              ))}
              {overview && (
                <>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="text-caption text-text-secondary">Badge Awards</div>
                    <div className="mt-2 text-2xl font-semibold text-text-primary">
                      {overview.summary.badgeAwards}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="text-caption text-text-secondary">Weekly Snapshots</div>
                    <div className="mt-2 text-2xl font-semibold text-text-primary">
                      {overview.summary.weeklySnapshots}
                    </div>
                    <div className="mt-2 text-caption text-text-tertiary">
                      Latest week {overview.summary.latestSnapshotWeek ?? 'n/a'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="text-caption text-text-secondary">Active Streak Rows</div>
                    <div className="mt-2 text-2xl font-semibold text-text-primary">
                      {overview.summary.activeStreaks}
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-title font-medium text-text-primary">Operational Notes</h3>
              <div className="mt-3 space-y-2 text-body text-text-secondary">
                <p>
                  Weekly rewards are evaluated automatically by the rewards weekly cron after snapshots are created.
                </p>
                <p>
                  Historical recovery is available via the backfill cron endpoint and the local script
                  <code className="ml-1 rounded bg-background px-1.5 py-0.5 text-caption">npm run cron:rewards:backfill</code>.
                </p>
                <p>
                  Use backfill after changing thresholds if you need historical badge evaluation to be recomputed for missing weeks.
                </p>
              </div>
            </section>
          </ScrollSection>
        </TabsContent>

        <TabsContent value="catalog" className="mt-0 h-[calc(100vh-16rem)] min-h-[32rem] overflow-hidden">
          <ScrollSection className="space-y-6">
            <section className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-title font-medium text-text-primary">Badge Catalog</h3>
              <div className="mt-2 space-y-2 text-body text-text-secondary">
                <p>
                  Badge definitions are still seeded from code for MVP, so reward logic is view-only here.
                </p>
                <p>
                  Badge art is admin-editable and stored on the badge definition itself. Seed refreshes now preserve saved art.
                </p>
              </div>
            </section>

            <section className="grid gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)]">
              <label className="space-y-1">
                <div className="text-caption text-text-secondary">Search badges</div>
                <Input
                  value={badgeCatalogFilters.search}
                  onChange={(event) => setBadgeCatalogFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))}
                  placeholder="Search by name, slug, or description"
                />
              </label>

              <label className="space-y-1">
                <div className="text-caption text-text-secondary">Category</div>
                <select
                  value={badgeCatalogFilters.category}
                  onChange={(event) => setBadgeCatalogFilters((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">All categories</option>
                  {Object.keys(badgeCountsByCategory).map((category) => (
                    <option key={category} value={category}>
                      {formatLabel(category)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <div className="text-caption text-text-tertiary">
              Showing {filteredBadgeDefinitions.length} of {badgeDefinitions.length} badge definitions.
            </div>

            <section className="grid gap-4 xl:grid-cols-2">
              {filteredBadgeDefinitions.map((badge) => {
                const conditionLines = buildBadgeConditionSummary(badge);
                const isExpanded = expandedBadgeIds[badge.id] ?? false;

                return (
                  <div key={badge.id} className="rounded-lg border border-border bg-surface p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-background">
                        {badge.iconUrl ? (
                          <img
                            src={badge.iconUrl}
                            alt={badge.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="px-3 text-center text-caption font-medium uppercase tracking-[0.12em] text-text-tertiary">
                            {badge.tier || 'Badge'}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="text-body font-medium text-text-primary">{badge.name}</h4>
                            <div className="mt-1 flex flex-wrap gap-2 text-caption text-text-tertiary">
                              <span>{formatLabel(badge.category)}</span>
                              {badge.tier && <span>{badge.tier}</span>}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => toggleBadgeSection(badge.id)}
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </Button>
                        </div>
                        <p className="mt-3 text-body text-text-secondary">{badge.description}</p>
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        <div className="mt-4 rounded-md border border-border-subtle bg-background p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-caption font-medium text-text-primary">Reward Conditions</div>
                            <div className="text-caption text-text-tertiary">{badge.slug}</div>
                          </div>
                          <div className="mt-2 space-y-1 text-caption text-text-secondary">
                            {conditionLines.map((line) => (
                              <div key={line}>{line}</div>
                            ))}
                          </div>
                          <pre className="mt-3 overflow-x-auto rounded-md border border-border-subtle bg-surface px-3 py-2 text-[11px] text-text-tertiary">
{JSON.stringify(badge.conditions, null, 2)}
                          </pre>
                        </div>

                        <div className="mt-4 rounded-md border border-border-subtle bg-background p-4">
                          <div className="text-caption font-medium text-text-primary">Badge Art</div>
                          <div className="mt-2 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                            <div className="space-y-2">
                              <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface">
                                {badge.iconUrl ? (
                                  <img
                                    src={badge.iconUrl}
                                    alt={badge.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <div className="text-caption text-text-tertiary">
                                    No badge art uploaded yet.
                                  </div>
                                )}
                              </div>
                              <div className="text-caption text-text-tertiary">
                                Upload a PNG, JPG, GIF, or WEBP image using the shared app upload flow.
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={() => handleBadgeUploadTrigger(badge.id)}
                                disabled={savingBadgeId === badge.id}
                              >
                                {savingBadgeId === badge.id ? 'Uploading...' : badge.iconUrl ? 'Replace Art' : 'Upload Art'}
                              </Button>
                              {badge.iconUrl && (
                                <Button
                                  variant="outline"
                                  onClick={() => void persistBadgeIcon(badge.id, null)}
                                  disabled={savingBadgeId === badge.id}
                                >
                                  Remove Art
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </section>
          </ScrollSection>
        </TabsContent>

        <TabsContent value="thresholds" className="mt-0 h-[calc(100vh-16rem)] min-h-[32rem] overflow-hidden">
          <ScrollSection className="space-y-4">
            {configs.map((config) => {
              const draft = drafts[config.seniority] ?? {
                seniority: config.seniority,
                expectedPointsPerWeek: config.expectedPointsPerWeek,
                expectedQualityAvg: config.expectedQualityAvg,
                warmUpPoints: config.warmUpPoints,
                steadyHandRatio: config.steadyHandRatio,
                inTheFlowRatio: config.inTheFlowRatio,
                onARollRatio: config.onARollRatio,
                powerhouseRatio: config.powerhouseRatio,
                forceOfNatureRatio: config.forceOfNatureRatio,
              };
              const isExpanded = expandedConfigs[config.seniority] ?? false;

              return (
                <div key={config.id} className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-title font-medium text-text-primary">
                        {SENIORITY_LABELS[config.seniority]}
                      </h3>
                      <p className="mt-1 text-caption text-text-tertiary">
                        Last updated {formatTimestamp(config.updatedAt)}
                      </p>
                      <p className="mt-2 text-caption text-text-secondary">
                        Expected {draft.expectedPointsPerWeek} pts/week - quality {draft.expectedQualityAvg}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleConfigSection(config.seniority)}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        onClick={() => void handleSave(config.seniority)}
                        disabled={savingKey === config.seniority}
                      >
                        {savingKey === config.seniority ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {NUMERIC_FIELDS.map((field) => (
                        <label key={field.key} className="space-y-1">
                          <div className="text-body font-medium text-text-primary">{field.label}</div>
                          <Input
                            type="number"
                            min="0"
                            step={field.step}
                            value={draft[field.key]}
                            onChange={(event) =>
                              updateDraftField(
                                config.seniority,
                                field.key,
                                event.target.value === '' ? 0 : Number(event.target.value)
                              )
                            }
                          />
                          <div className="text-caption text-text-tertiary">{field.help}</div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </ScrollSection>
        </TabsContent>

        <TabsContent value="debug" className="mt-0 h-[calc(100vh-16rem)] min-h-[32rem] overflow-hidden">
          <ScrollSection className="space-y-6">
            {overview && (
              <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-title font-medium text-text-primary">Debug Overview</h3>
              <p className="mt-1 text-body text-text-secondary">
                Recent rewards system activity for verification and troubleshooting.
              </p>
            </div>
            <Button variant="outline" onClick={() => void loadData(appliedFilters)}>
              Refresh Debug Data
            </Button>
          </div>

          <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <label className="space-y-1">
              <div className="text-caption text-text-secondary">User</div>
              <select
                value={filterDraft.userId}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, userId: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All users</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-caption text-text-secondary">Badge category</div>
              <select
                value={filterDraft.badgeCategory}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, badgeCategory: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All badge categories</option>
                {overview.availableFilters.badgeCategories.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-caption text-text-secondary">Streak type</div>
              <select
                value={filterDraft.streakType}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, streakType: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">All streak types</option>
                {overview.availableFilters.streakTypes.map((streak) => (
                  <option key={streak.value} value={streak.value}>
                    {streak.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-caption text-text-secondary">Start week</div>
              <Input
                type="date"
                value={filterDraft.startWeekDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, startWeekDate: event.target.value }))
                }
              />
            </label>

            <label className="space-y-1">
              <div className="text-caption text-text-secondary">End week</div>
              <Input
                type="date"
                value={filterDraft.endWeekDate}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, endWeekDate: event.target.value }))
                }
              />
            </label>

            <div className="flex items-end">
              <Button onClick={handleApplyFilters}>Apply</Button>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </div>

          <div className="text-caption text-text-tertiary">
            Active filters:
            {' '}
            {selectedUserLabel ?? 'all users'}
            {selectedBadgeCategoryLabel ? `, badge category ${selectedBadgeCategoryLabel}` : ''}
            {selectedStreakTypeLabel ? `, streak ${selectedStreakTypeLabel}` : ''}
            {overview.filters.startWeekDate ? `, from ${overview.filters.startWeekDate}` : ''}
            {overview.filters.endWeekDate ? `, to ${overview.filters.endWeekDate}` : ''}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <h4 className="text-body font-medium text-text-primary">Recent Snapshots</h4>
              <div className="mt-3 space-y-3">
                {overview.recentSnapshots.length === 0 ? (
                  <div className="text-caption text-text-tertiary">No snapshots yet.</div>
                ) : (
                  overview.recentSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="rounded-md border border-border-subtle bg-background px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-text-primary">
                            {snapshot.user.name || snapshot.user.email}
                          </div>
                          <div className="text-caption text-text-tertiary">
                            {snapshot.weekStartDate} to {snapshot.weekEndDate}
                          </div>
                        </div>
                        <div className="text-caption text-text-tertiary">
                          {snapshot.user.seniority || 'n/a'}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-caption text-text-secondary">
                        <div>{snapshot.storyPointsCompleted} pts</div>
                        <div>{snapshot.cardsCompleted} cards</div>
                        <div>
                          quality{' '}
                          {snapshot.avgQualityScore !== null
                            ? snapshot.avgQualityScore.toFixed(2)
                            : 'n/a'}
                        </div>
                        <div>
                          reviews{' '}
                          {snapshot.evaluationRate !== null
                            ? `${Math.round(snapshot.evaluationRate * 100)}%`
                            : 'n/a'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h4 className="text-body font-medium text-text-primary">Recent Badge Awards</h4>
              <div className="mt-3 space-y-3">
                {overview.recentAwards.length === 0 ? (
                  <div className="text-caption text-text-tertiary">No badge awards yet.</div>
                ) : (
                  overview.recentAwards.map((award) => (
                    <div
                      key={award.id}
                      className="rounded-md border border-border-subtle bg-background px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-text-primary">
                            {award.badge.name}
                          </div>
                          <div className="truncate text-caption text-text-secondary">
                            {award.user.name || award.user.email}
                          </div>
                        </div>
                        <div className="text-caption text-text-tertiary">
                          {award.badge.category}
                        </div>
                      </div>
                      <div className="mt-2 text-caption text-text-tertiary">
                        {formatTimestamp(award.awardedAt)}
                      </div>
                      {award.triggerSnapshotWeek && (
                        <div className="mt-1 text-caption text-text-tertiary">
                          Snapshot week {award.triggerSnapshotWeek}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <h4 className="text-body font-medium text-text-primary">Active Streaks</h4>
              <div className="mt-3 space-y-3">
                {overview.activeStreaks.length === 0 ? (
                  <div className="text-caption text-text-tertiary">No active streaks yet.</div>
                ) : (
                  overview.activeStreaks.map((streak) => (
                    <div
                      key={streak.id}
                      className="rounded-md border border-border-subtle bg-background px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-text-primary">
                            {streak.label}
                          </div>
                          <div className="truncate text-caption text-text-secondary">
                            {streak.user.name || streak.user.email}
                          </div>
                        </div>
                        <div className="text-right text-caption text-text-tertiary">
                          <div>{streak.currentCount}w</div>
                          <div>best {streak.longestCount}w</div>
                        </div>
                      </div>
                      <div className="mt-2 text-caption text-text-tertiary">
                        {streak.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

              </>
            )}
          </ScrollSection>
        </TabsContent>

        <TabsContent value="history" className="mt-0 h-[calc(100vh-16rem)] min-h-[32rem] overflow-hidden">
          <ScrollSection className="space-y-4">
            {!selectedUserHistory ? (
              <div className="rounded-lg border border-border bg-surface p-5 text-body text-text-secondary">
                Select a user in the Debug tab to inspect weekly snapshot history, active streaks,
                and snapshot-triggered badge awards.
              </div>
            ) : (
            <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-body font-medium text-text-primary">Selected User History</h4>
                  <p className="mt-1 text-caption text-text-secondary">
                    {selectedUserHistory.user.name || selectedUserHistory.user.email}
                    {' '}
                    {selectedUserHistory.user.seniority
                      ? `(${selectedUserHistory.user.seniority})`
                      : ''}
                  </p>
                </div>
                <div className="grid gap-2 text-right text-caption text-text-tertiary sm:grid-cols-2 sm:text-left">
                  <div>
                    {selectedUserHistory.summary.totalSnapshots}
                    {' '}
                    total snapshots
                  </div>
                  <div>
                    showing
                    {' '}
                    {selectedUserHistory.summary.returnedSnapshots}
                  </div>
                  <div>
                    avg points
                    {' '}
                    {selectedUserHistory.summary.averagePointsPerSnapshot !== null
                      ? selectedUserHistory.summary.averagePointsPerSnapshot.toFixed(1)
                      : 'n/a'}
                  </div>
                  <div>
                    avg quality
                    {' '}
                    {selectedUserHistory.summary.averageQualityScore !== null
                      ? selectedUserHistory.summary.averageQualityScore.toFixed(2)
                      : 'n/a'}
                  </div>
                </div>
              </div>

              {selectedUserHistory.activeStreaks.length > 0 && (
                <div className="rounded-md border border-border-subtle bg-background p-4">
                  <div className="text-caption font-medium text-text-primary">Current Active Streaks</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedUserHistory.activeStreaks.map((streak) => (
                      <div
                        key={streak.id}
                        className="rounded-md border border-border-subtle bg-surface px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 text-body font-medium text-text-primary">
                            {streak.label}
                          </div>
                          <div className="text-caption text-text-tertiary">
                            {streak.currentCount}w
                          </div>
                        </div>
                        <div className="mt-1 text-caption text-text-secondary">
                          {streak.description}
                        </div>
                        <div className="mt-2 text-caption text-text-tertiary">
                          Best {streak.longestCount}w
                          {streak.lastQualifiedWeek ? ` - last ${streak.lastQualifiedWeek}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {selectedUserHistory.snapshots.length === 0 ? (
                  <div className="text-caption text-text-tertiary">
                    No weekly snapshots found for the selected filters.
                  </div>
                ) : (
                  selectedUserHistory.snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="rounded-md border border-border-subtle bg-background p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-body font-medium text-text-primary">
                            Week {snapshot.weekStartDate} to {snapshot.weekEndDate}
                          </div>
                          <div className="mt-1 text-caption text-text-tertiary">
                            Seniority snapshot {snapshot.seniorityAtSnapshot || 'n/a'}
                            {' - '}
                            Created {formatTimestamp(snapshot.createdAt)}
                          </div>
                        </div>
                        <div className="text-caption text-text-tertiary">
                          {snapshot.badgeAwards.length}
                          {' '}
                          triggered badge{snapshot.badgeAwards.length === 1 ? '' : 's'}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-caption text-text-secondary sm:grid-cols-2 xl:grid-cols-4">
                        <div>{snapshot.storyPointsCompleted} pts completed</div>
                        <div>{snapshot.cardsCompleted} cards completed</div>
                        <div>
                          quality{' '}
                          {snapshot.avgQualityScore !== null
                            ? snapshot.avgQualityScore.toFixed(2)
                            : 'n/a'}
                        </div>
                        <div>
                          first pass{' '}
                          {snapshot.firstPassRate !== null
                            ? `${Math.round(snapshot.firstPassRate * 100)}%`
                            : 'n/a'}
                        </div>
                        <div>
                          review cycles{' '}
                          {snapshot.avgReviewCycles !== null
                            ? snapshot.avgReviewCycles.toFixed(2)
                            : 'n/a'}
                        </div>
                        <div>
                          evaluations {snapshot.evaluationsSubmitted}/{snapshot.evaluationEligible}
                        </div>
                        <div>
                          eval rate{' '}
                          {snapshot.evaluationRate !== null
                            ? `${Math.round(snapshot.evaluationRate * 100)}%`
                            : 'n/a'}
                        </div>
                        <div>scored cards {snapshot.scoredCardCount}</div>
                      </div>

                      {snapshot.badgeAwards.length > 0 && (
                        <div className="mt-4">
                          <div className="text-caption font-medium text-text-primary">
                            Triggered badges
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {snapshot.badgeAwards.map((award) => (
                              <div
                                key={award.id}
                                className="rounded-full border border-border-subtle bg-surface px-3 py-1 text-caption text-text-secondary"
                                title={award.badge.description}
                              >
                                {award.badge.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            )}
          </ScrollSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
