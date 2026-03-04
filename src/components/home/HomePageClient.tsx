'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/lib/date-utils';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { BadgeMedallion } from '@/components/rewards/BadgeMedallion';
import type { BadgeDisplayDefinition } from '@/lib/rewards/presentation';

interface HomeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface HomeTask {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  listId: string;
  listName: string;
  listPhase: string | null;
  listColor: string | null;
  updatedAt: string;
  assignedAt: string;
  deadline: string | null;
  dueSoon: boolean;
  overdue: boolean;
  blocked: boolean;
  completed: boolean;
  storyPoints: number | null;
}

interface HomeBoard {
  id: string;
  name: string;
  description: string | null;
  permission: string;
  updatedAt: string;
  team: {
    id: string;
    name: string;
    color: string;
  } | null;
  memberCount: number;
  listCount: number;
}

interface HomeProject {
  id: string;
  name: string;
  productionTitle: string | null;
  team: {
    id: string;
    name: string;
    color: string;
  } | null;
  updatedAt: string;
}

interface PendingEvaluation {
  id: string;
  cycleNumber: number;
  openedAt: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  boardName: string;
}

interface HomeRewardBadge {
  id: string;
  awardedAt: string;
  badge: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: BadgeDisplayDefinition['category'];
    tier: string | null;
    iconUrl: string | null;
  };
}

interface HomeActiveStreak {
  id: string;
  streakType: string;
  label: string;
  description: string;
  currentCount: number;
  longestCount: number;
  lastQualifiedWeek: string | null;
  graceUsed: boolean;
  isActive: boolean;
}

interface HomeData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    permission: string;
    evaluatorRoles: string[];
  };
  stats: {
    myTaskCount: number;
    myBoardCount: number;
    myProjectCount: number;
    unreadNotifications: number;
    pendingEvaluations: number;
    dueSoonCount: number;
    overdueCount: number;
  };
  myTasks: HomeTask[];
  myBoards: HomeBoard[];
  myProjects: HomeProject[];
  pendingEvaluations: PendingEvaluation[];
  notifications: HomeNotification[];
  rewards: {
    loginStreak: {
      currentStreak: number;
      longestStreak: number;
      totalLoginDays: number;
      lastLoginDate: string | null;
    };
    activeStreaks: HomeActiveStreak[];
    recentBadgeAwards: HomeRewardBadge[];
  };
  suggestedRoutes: string[];
}

function relativeTimeLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(date);
}

function displayName(name: string | null, email: string): string {
  if (name && name.trim().length > 0) return name;
  return email.split('@')[0] || 'there';
}

export function HomePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [reviewsCollapsed, setReviewsCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('home-reviews-collapsed') === 'true'
  );
  const [notificationsCollapsed, setNotificationsCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('home-notifications-collapsed') === 'true'
  );
  const [skippedReviews, setSkippedReviews] = useState<Set<string>>(
    () => {
      if (typeof window === 'undefined') return new Set();
      try {
        const stored = localStorage.getItem('home-skipped-reviews');
        return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
      } catch { return new Set(); }
    }
  );
  const [deletedReviews, setDeletedReviews] = useState<Set<string>>(
    () => {
      if (typeof window === 'undefined') return new Set();
      try {
        const stored = localStorage.getItem('home-deleted-reviews');
        return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
      } catch { return new Set(); }
    }
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleReviews = () => {
    setReviewsCollapsed((prev) => {
      localStorage.setItem('home-reviews-collapsed', String(!prev));
      return !prev;
    });
  };

  const toggleNotifications = () => {
    setNotificationsCollapsed((prev) => {
      localStorage.setItem('home-notifications-collapsed', String(!prev));
      return !prev;
    });
  };

  const skipReview = (cycleId: string) => {
    setSkippedReviews((prev) => {
      const next = new Set(prev);
      next.add(cycleId);
      localStorage.setItem('home-skipped-reviews', JSON.stringify([...next]));
      return next;
    });
  };

  const confirmDeleteReview = (cycleId: string) => {
    setDeleteConfirmId(cycleId);
  };

  const executeDeleteReview = () => {
    if (!deleteConfirmId) return;
    setDeletedReviews((prev) => {
      const next = new Set(prev);
      next.add(deleteConfirmId);
      localStorage.setItem('home-deleted-reviews', JSON.stringify([...next]));
      return next;
    });
    // Also remove from skipped if it was there
    setSkippedReviews((prev) => {
      const next = new Set(prev);
      next.delete(deleteConfirmId);
      localStorage.setItem('home-skipped-reviews', JSON.stringify([...next]));
      return next;
    });
    setDeleteConfirmId(null);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: () => apiFetch<HomeData>('/api/me/home'),
    staleTime: 60_000,
  });

  // Prefetch routes (Next.js RSC chunks) and heavy TanStack Query data
  // so first navigation to timeline / board detail feels instant
  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      const routes = new Set(data.suggestedRoutes);
      routes.add('/boards');
      routes.add('/projects');
      routes.add('/badges');

      for (const route of Array.from(routes).slice(0, 4)) {
        router.prefetch(route);
      }

      for (const board of data.myBoards.slice(0, 2)) {
        router.prefetch(`/boards/${board.id}`);
      }

      for (const project of data.myProjects.slice(0, 1)) {
        router.prefetch(`/projects/${project.id}`);
      }

      // Eagerly prefetch API data for the heaviest pages
      void queryClient.prefetchQuery({
        queryKey: ['timeline'],
        queryFn: () => apiFetch('/api/timeline'),
        staleTime: 5 * 60 * 1000,
      });

      for (const board of data.myBoards.slice(0, 2)) {
        void queryClient.prefetchQuery({
          queryKey: ['boards', board.id, 'light'],
          queryFn: () => apiFetch(`/api/boards/${board.id}?scope=light`),
          staleTime: 60_000,
        });
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [data, router, queryClient]);

  const prefetchBoard = (boardId: string) => {
    if (queryClient.getQueryData(['boards', boardId, 'light'])) return;
    void queryClient.prefetchQuery({
      queryKey: ['boards', boardId, 'light'],
      queryFn: () => apiFetch(`/api/boards/${boardId}?scope=light`),
      staleTime: 60_000,
    });
  };

  const markOneRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: 'PATCH' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['home'] });
      const prev = queryClient.getQueryData<HomeData>(['home']);
      if (prev) {
        queryClient.setQueryData<HomeData>(['home'], {
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== id),
          stats: {
            ...prev.stats,
            unreadNotifications: Math.max(0, prev.stats.unreadNotifications - 1),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['home'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      apiFetch('/api/notifications/mark-all-read', { method: 'POST' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['home'] });
      const prev = queryClient.getQueryData<HomeData>(['home']);
      if (prev) {
        queryClient.setQueryData<HomeData>(['home'], {
          ...prev,
          notifications: [],
          stats: { ...prev.stats, unreadNotifications: 0 },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['home'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  });

  if (isLoading || !data) return <HomeSkeleton />;

  const viewerName = displayName(data.user.name, data.user.email);
  const hasEvaluatorRole = data.user.evaluatorRoles.length > 0;
  const visibleEvaluations = data.pendingEvaluations.filter((item) => !deletedReviews.has(item.id));
  const pendingReviewCount = visibleEvaluations.filter((item) => !skippedReviews.has(item.id)).length;
  const latestHeaderBadges = data.rewards.recentBadgeAwards.slice(0, 3);
  const statCards = [
    {
      key: 'tasks',
      label: 'My Open Tasks',
      value: data.stats.myTaskCount,
      detail: `${data.stats.dueSoonCount} due soon`,
      icon: ListChecks,
      accent: {
        fill: 'rgba(90, 151, 248, 0.16)',
        border: 'rgba(90, 151, 248, 0.3)',
        iconBg: 'rgba(90, 151, 248, 0.18)',
        iconColor: '#83B5FF',
      },
    },
    {
      key: 'boards',
      label: 'My Boards',
      value: data.stats.myBoardCount,
      detail: `${data.stats.myProjectCount} active projects`,
      icon: LayoutGrid,
      accent: {
        fill: 'rgba(46, 203, 178, 0.16)',
        border: 'rgba(46, 203, 178, 0.28)',
        iconBg: 'rgba(46, 203, 178, 0.18)',
        iconColor: '#64E3CD',
      },
    },
    {
      key: 'reviews',
      label: 'Pending Reviews',
      value: pendingReviewCount,
      detail: hasEvaluatorRole ? 'Needs your input' : 'No evaluator role',
      icon: CheckCircle2,
      accent: {
        fill: 'rgba(244, 186, 82, 0.16)',
        border: 'rgba(244, 186, 82, 0.28)',
        iconBg: 'rgba(244, 186, 82, 0.18)',
        iconColor: '#FFD06E',
      },
    },
    {
      key: 'notifications',
      label: 'Unread Notifications',
      value: data.stats.unreadNotifications,
      detail: `${data.stats.overdueCount} overdue tasks`,
      icon: Bell,
      accent: {
        fill: 'rgba(242, 92, 132, 0.16)',
        border: 'rgba(242, 92, 132, 0.28)',
        iconBg: 'rgba(242, 92, 132, 0.18)',
        iconColor: '#FF90AD',
      },
    },
  ] as const;

  return (
    <div className="home-page flex-1 overflow-auto p-6">
      <div className="home-shell mx-auto w-full max-w-7xl space-y-6">
        <div className="home-hero rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="home-avatar relative shrink-0">
                {data.user.image ? (
                  <img
                    src={data.user.image}
                    alt={viewerName}
                    className="h-20 w-20 rounded-full border-2 border-border object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-primary/10 text-2xl font-bold text-primary">
                    {(data.user.name?.[0] || data.user.email[0] || '?').toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="home-hero-title text-heading font-semibold">Welcome back, {viewerName}</h1>
                <p className="home-hero-subtitle mt-1 text-body text-text-secondary">
                  Personalized overview of your tasks, boards, reviews, notifications, and rewards.
                </p>
                <div className="home-hero-actions mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href="/boards"
                    className="home-cta home-cta-primary inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body hover:bg-surface-hover"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Open Boards
                  </Link>
                  {hasEvaluatorRole && (
                    <Link
                      href="/timeline"
                      className="home-cta home-cta-secondary inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body hover:bg-surface-hover"
                    >
                      <Calendar className="h-4 w-4" />
                      Open Timeline
                    </Link>
                  )}
                  <Link
                    href="/projects"
                    className="home-cta home-cta-secondary inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body hover:bg-surface-hover"
                  >
                    <FolderKanban className="h-4 w-4" />
                    Open Projects
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/badges"
              className="group self-end rounded-2xl border border-border-subtle bg-background/70 px-4 py-3 transition-colors hover:bg-background lg:self-start"
            >
              <div className="flex items-start justify-end">
                {latestHeaderBadges.length > 0 ? (
                  latestHeaderBadges.map((award, index) => (
                    <div
                      key={award.id}
                      className={cn(index > 0 && '-ml-5')}
                      style={{
                        zIndex: latestHeaderBadges.length - index,
                        transform: `translateY(${index * 7}px)`,
                      }}
                    >
                      <BadgeMedallion
                        badge={award.badge}
                        size="lg"
                        className="transition-transform duration-200 group-hover:-translate-y-1"
                      />
                    </div>
                  ))
                ) : (
                  [0, 1, 2].map((index) => (
                    <div
                      key={`placeholder-${index}`}
                      className={cn('relative', index > 0 && '-ml-5')}
                      style={{
                        zIndex: 3 - index,
                        transform: `translateY(${index * 7}px)`,
                      }}
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border-subtle bg-background/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <Award className="h-7 w-7 text-text-tertiary" />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 text-right">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                  Latest badges
                </div>
                <div className="mt-1 text-sm font-medium text-text-primary">
                  {latestHeaderBadges.length > 0 ? 'View your collection' : 'Earn your first badge'}
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="home-stats-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.key}
                className="home-stat-card relative overflow-hidden rounded-xl border bg-surface px-4 py-4"
                style={{
                  borderColor: card.accent.border,
                }}
              >
                <div
                  className="absolute -right-5 -top-5 h-16 w-16 rounded-full blur-2xl"
                  style={{ backgroundColor: card.accent.fill }}
                  aria-hidden="true"
                />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                        {card.label}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-xl font-semibold leading-none text-text-primary">
                        {card.value}
                      </div>
                      <Icon
                        className="h-4 w-4"
                        style={{ color: card.accent.iconColor }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-caption text-text-secondary">
                    {card.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="home-content-grid grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <section className="home-panel home-panel-tasks rounded-lg border border-border bg-surface">
            <header className="home-panel-header flex items-center border-b border-border px-4 py-3">
              <h2 className="font-medium">My Tasks</h2>
              <span className="home-panel-count ml-2 text-caption text-text-tertiary">{data.myTasks.length}</span>
            </header>
            {data.myTasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary">
                No open tasks assigned right now.
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-3">
                {data.myTasks.slice(0, 10).map((task) => (
                  <Link
                    key={task.id}
                    href={`/boards/${task.boardId}?card=${task.id}`}
                    onMouseEnter={() => prefetchBoard(task.boardId)}
                    className="home-list-row block rounded-md border border-border-subtle bg-surface p-2.5 transition-shadow hover:shadow-sm"
                    style={task.listColor ? { backgroundColor: `${task.listColor}18` } : undefined}
                  >
                    <div className="flex items-start gap-2">
                      <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-card-task" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-body font-medium text-text-primary">{task.title}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {task.overdue && (
                              <span className="inline-flex items-center gap-1 rounded bg-error/10 px-2 py-0.5 text-caption text-error">
                                <AlertTriangle className="h-3 w-3" />
                                Overdue
                              </span>
                            )}
                            {!task.overdue && task.dueSoon && (
                              <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-2 py-0.5 text-caption text-warning">
                                <Clock className="h-3 w-3" />
                                Due Soon
                              </span>
                            )}
                            {task.storyPoints !== null && (
                              <span className="home-task-sp-badge rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                                {task.storyPoints} SP
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-caption text-text-secondary">
                          <span>{task.boardName} - {task.listName}</span>
                          {task.deadline && (
                            <>
                              <span className="text-text-tertiary">&middot;</span>
                              <span className="text-text-tertiary">{formatShortDate(task.deadline)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="home-side-stack space-y-6">
            <section className="home-panel home-panel-rewards rounded-lg border border-border bg-surface">
              <header className="home-panel-header flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-medium">Rewards</h2>
                <Link
                  href="/badges"
                  className="home-panel-count text-caption text-text-tertiary hover:text-text-primary"
                >
                  View all badges
                </Link>
              </header>
              <div className="space-y-4 px-4 py-4">
                <div className="rounded-md border border-border bg-background px-3 py-3">
                  <div className="text-caption text-text-secondary">Current Login Streak</div>
                  <div className="mt-1 text-2xl font-semibold text-text-primary">
                    {data.rewards.loginStreak.currentStreak}
                  </div>
                  <div className="mt-1 text-caption text-text-tertiary">
                    Longest: {data.rewards.loginStreak.longestStreak} days
                  </div>
                  <div className="text-caption text-text-tertiary">
                    Total login days: {data.rewards.loginStreak.totalLoginDays}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-caption font-medium text-text-secondary">
                    Active Weekly Streaks
                  </div>
                  {data.rewards.activeStreaks.length === 0 ? (
                    <div className="text-caption text-text-tertiary">
                      No active weekly streaks yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.rewards.activeStreaks.map((streak) => (
                        <div
                          key={streak.id}
                          className="rounded-md border border-border bg-background px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-body font-medium text-text-primary">
                                {streak.label}
                              </div>
                              <div className="truncate text-caption text-text-secondary">
                                {streak.description}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-body font-medium text-text-primary">
                                {streak.currentCount}w
                              </div>
                              <div className="text-caption text-text-tertiary">
                                best {streak.longestCount}w
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-caption font-medium text-text-secondary">
                    Latest Badges
                  </div>
                  {data.rewards.recentBadgeAwards.length === 0 ? (
                    <div className="text-caption text-text-tertiary">
                      No badges earned yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.rewards.recentBadgeAwards.map((award) => (
                        <div
                          key={award.id}
                          className="rounded-md border border-border bg-background px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <BadgeMedallion badge={award.badge} size="sm" />
                              <div className="min-w-0">
                                <div className="truncate text-body font-medium text-text-primary">
                                  {award.badge.name}
                                </div>
                                <div className="truncate text-caption text-text-secondary">
                                  {award.badge.description}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-caption text-text-tertiary">
                              {relativeTimeLabel(award.awardedAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {hasEvaluatorRole && (
              <section className="home-panel home-panel-reviews rounded-lg border border-border bg-surface">
                <header
                  onClick={toggleReviews}
                  className="home-panel-header flex cursor-pointer items-center justify-between border-b border-border px-4 py-3 select-none hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={cn('h-4 w-4 text-text-tertiary transition-transform', reviewsCollapsed && '-rotate-90')} />
                    <h2 className="font-medium">Pending Reviews</h2>
                    <span className="home-panel-count text-caption text-text-tertiary">{pendingReviewCount}</span>
                  </div>
                </header>
                {!reviewsCollapsed && (
                  visibleEvaluations.length === 0 ? (
                    <div className="px-4 py-6 text-caption text-text-secondary">
                      No pending review cycles.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {visibleEvaluations.map((item) => {
                        const isSkipped = skippedReviews.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'home-list-row group flex items-start gap-2 px-4 py-3',
                              isSkipped && 'opacity-50'
                            )}
                          >
                            <Link
                              href={`/boards/${item.boardId}`}
                              onMouseEnter={() => prefetchBoard(item.boardId)}
                              className="min-w-0 flex-1 hover:underline"
                            >
                              <div className={cn('truncate text-body font-medium text-text-primary', isSkipped && 'line-through')}>
                                {item.cardTitle}
                              </div>
                              <div className="mt-0.5 text-caption text-text-secondary">
                                {item.boardName} - Cycle {item.cycleNumber}
                                {isSkipped && <span className="ml-1.5 text-text-tertiary">(skipped)</span>}
                              </div>
                            </Link>
                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {!isSkipped && (
                                <button
                                  onClick={() => skipReview(item.id)}
                                  className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                                  title="Skip this review"
                                >
                                  <SkipForward className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => confirmDeleteReview(item.id)}
                                className="rounded p-1 text-text-tertiary hover:bg-error/10 hover:text-error"
                                title="Remove this review"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </section>
            )}

            {deleteConfirmId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg">
                  <h3 className="font-semibold text-text-primary">Remove review?</h3>
                  <p className="mt-2 text-body text-text-secondary">
                    This will permanently hide this review from your dashboard. It will reappear if a new cycle opens.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-md border border-border px-3 py-1.5 text-body text-text-secondary hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeDeleteReview}
                      className="rounded-md bg-error px-3 py-1.5 text-body text-white hover:bg-error/90"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className="home-panel home-panel-notifications rounded-lg border border-border bg-surface">
              <header className="home-panel-header flex items-center justify-between border-b border-border px-4 py-3">
                <div
                  onClick={toggleNotifications}
                  className="flex cursor-pointer items-center gap-2 select-none"
                >
                  <ChevronDown className={cn('h-4 w-4 text-text-tertiary transition-transform', notificationsCollapsed && '-rotate-90')} />
                  <h2 className="font-medium">Notifications</h2>
                  <span className="home-panel-count text-caption text-text-tertiary">{data.notifications.length}</span>
                </div>
                {!notificationsCollapsed && data.notifications.length > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </header>
              {!notificationsCollapsed && (
                data.notifications.length === 0 ? (
                  <div className="px-4 py-6 text-caption text-text-secondary">No notifications yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.notifications.slice(0, 6).map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'home-list-row group flex items-start gap-2 px-4 py-3',
                          !notification.read && 'home-unread-row bg-primary/5'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-body font-medium text-text-primary">{notification.title}</div>
                          <div className="mt-0.5 line-clamp-2 text-caption text-text-secondary">
                            {notification.message}
                          </div>
                          <div className="mt-1 text-caption text-text-tertiary">
                            {relativeTimeLabel(notification.createdAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => markOneRead.mutate(notification.id)}
                          disabled={markOneRead.isPending}
                          className="shrink-0 rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface-hover hover:text-text-primary group-hover:opacity-100"
                          title="Mark as read"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </section>

            <section className="home-panel home-panel-boards rounded-lg border border-border bg-surface">
              <header className="home-panel-header flex items-center border-b border-border px-4 py-3">
                <h2 className="font-medium">My Boards</h2>
                <span className="home-panel-count ml-2 text-caption text-text-tertiary">{data.myBoards.length}</span>
              </header>
              {data.myBoards.length === 0 ? (
                <div className="px-4 py-6 text-caption text-text-secondary">You are not assigned to any boards.</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.myBoards.slice(0, 6).map((board) => (
                    <Link
                      key={board.id}
                      href={`/boards/${board.id}`}
                      onMouseEnter={() => prefetchBoard(board.id)}
                      className="home-list-row block px-4 py-3 hover:bg-surface-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-text-primary">{board.name}</div>
                          <div className="mt-0.5 text-caption text-text-secondary">
                            {board.team?.name || 'No team'} - {board.memberCount} members
                          </div>
                        </div>
                        <span className="home-badge-inline rounded bg-surface-hover px-2 py-0.5 text-caption text-text-tertiary">
                          {board.permission}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
