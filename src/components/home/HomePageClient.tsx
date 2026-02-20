'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FolderKanban,
  LayoutGrid,
  ListChecks,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';

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

interface HomeData {
  user: {
    id: string;
    name: string | null;
    email: string;
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
  return date.toLocaleDateString();
}

function displayName(name: string | null, email: string): string {
  if (name && name.trim().length > 0) return name;
  return email.split('@')[0] || 'there';
}

export function HomePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  if (isLoading || !data) return <HomeSkeleton />;

  const viewerName = displayName(data.user.name, data.user.email);
  const hasEvaluatorRole = data.user.evaluatorRoles.length > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-lg border border-border bg-surface p-5">
          <h1 className="text-heading font-semibold">Welcome back, {viewerName}</h1>
          <p className="mt-1 text-body text-text-secondary">
            Personalized overview of your tasks, boards, reviews, and notifications.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-secondary">My Open Tasks</span>
              <ListChecks className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{data.stats.myTaskCount}</div>
            <div className="mt-1 text-caption text-text-tertiary">{data.stats.dueSoonCount} due soon</div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-secondary">My Boards</span>
              <LayoutGrid className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{data.stats.myBoardCount}</div>
            <div className="mt-1 text-caption text-text-tertiary">{data.stats.myProjectCount} active projects</div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-secondary">Pending Reviews</span>
              <CheckCircle2 className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{data.stats.pendingEvaluations}</div>
            <div className="mt-1 text-caption text-text-tertiary">
              {hasEvaluatorRole ? 'Needs your input' : 'No evaluator role'}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-secondary">Unread Notifications</span>
              <Bell className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{data.stats.unreadNotifications}</div>
            <div className="mt-1 text-caption text-text-tertiary">
              {data.stats.overdueCount} overdue tasks
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/boards"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body hover:bg-surface-hover"
          >
            <LayoutGrid className="h-4 w-4" />
            Open Boards
          </Link>
          {hasEvaluatorRole && (
            <Link
              href="/timeline"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body hover:bg-surface-hover"
            >
              <Calendar className="h-4 w-4" />
              Open Timeline
            </Link>
          )}
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-body hover:bg-surface-hover"
          >
            <FolderKanban className="h-4 w-4" />
            Open Projects
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <section className="rounded-lg border border-border bg-surface">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-medium">My Tasks</h2>
              <span className="text-caption text-text-tertiary">{data.myTasks.length}</span>
            </header>
            {data.myTasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-secondary">
                No open tasks assigned right now.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.myTasks.slice(0, 10).map((task) => (
                  <Link
                    key={task.id}
                    href={`/boards/${task.boardId}`}
                    onMouseEnter={() => prefetchBoard(task.boardId)}
                    className="block px-4 py-3 hover:bg-surface-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-body font-medium text-text-primary">{task.title}</div>
                        <div className="mt-0.5 text-caption text-text-secondary">
                          {task.boardName} - {task.listName}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
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
                          <span className="rounded bg-surface-hover px-2 py-0.5 text-caption text-text-tertiary">
                            {task.storyPoints} SP
                          </span>
                        )}
                      </div>
                    </div>
                    {task.deadline && (
                      <div className="mt-1 text-caption text-text-tertiary">
                        Deadline: {new Date(task.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-6">
            {hasEvaluatorRole && (
              <section className="rounded-lg border border-border bg-surface">
                <header className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="font-medium">Pending Reviews</h2>
                  <span className="text-caption text-text-tertiary">{data.pendingEvaluations.length}</span>
                </header>
                {data.pendingEvaluations.length === 0 ? (
                  <div className="px-4 py-6 text-caption text-text-secondary">
                    No pending review cycles.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {data.pendingEvaluations.map((item) => (
                      <Link
                        key={item.id}
                        href={`/boards/${item.boardId}`}
                        onMouseEnter={() => prefetchBoard(item.boardId)}
                        className="block px-4 py-3 hover:bg-surface-hover"
                      >
                        <div className="truncate text-body font-medium text-text-primary">{item.cardTitle}</div>
                        <div className="mt-0.5 text-caption text-text-secondary">
                          {item.boardName} - Cycle {item.cycleNumber}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-lg border border-border bg-surface">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-medium">Notifications</h2>
                <span className="text-caption text-text-tertiary">{data.notifications.length}</span>
              </header>
              {data.notifications.length === 0 ? (
                <div className="px-4 py-6 text-caption text-text-secondary">No notifications yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.notifications.slice(0, 6).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-4 py-3',
                        !notification.read && 'bg-primary/5'
                      )}
                    >
                      <div className="truncate text-body font-medium text-text-primary">{notification.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-caption text-text-secondary">
                        {notification.message}
                      </div>
                      <div className="mt-1 text-caption text-text-tertiary">
                        {relativeTimeLabel(notification.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-medium">My Boards</h2>
                <span className="text-caption text-text-tertiary">{data.myBoards.length}</span>
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
                      className="block px-4 py-3 hover:bg-surface-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-body font-medium text-text-primary">{board.name}</div>
                          <div className="mt-0.5 text-caption text-text-secondary">
                            {board.team?.name || 'No team'} - {board.memberCount} members
                          </div>
                        </div>
                        <span className="rounded bg-surface-hover px-2 py-0.5 text-caption text-text-tertiary">
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
