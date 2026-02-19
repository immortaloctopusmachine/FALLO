'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Calendar, TrendingUp, Loader2, Briefcase, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDisplayDate } from '@/lib/date-utils';
import type { Board as ProjectBoard, User as BaseUser } from '@/types';

interface TimeLog {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  isManual: boolean;
  notes: string | null;
  card: {
    id: string;
    title: string;
    list: {
      id: string;
      name: string;
      board: {
        id: string;
        name: string;
      };
    };
  };
  list: {
    id: string;
    name: string;
  };
}

interface PhaseTime {
  phase: string;
  ms: number;
  formatted: string;
}

interface TimeStats {
  totalMs: number;
  totalFormatted: string;
  thisWeekMs: number;
  thisWeekFormatted: string;
  thisMonthMs: number;
  thisMonthFormatted: string;
  effectiveWorkDays: number;
  daysWithLogs: number;
  avgHoursPerDay: number;
  timeByPhase: PhaseTime[];
}

interface UserTimeStatsClientProps {
  user: Pick<BaseUser, 'id' | 'name' | 'email' | 'image'>;
  boards: Pick<ProjectBoard, 'id' | 'name'>[];
  currentUserId: string;
}

// Phase colors for the breakdown display
const PHASE_COLORS: Record<string, string> = {
  BACKLOG: '#6B7280',
  SPINE_PROTOTYPE: '#8B5CF6',
  CONCEPT: '#EC4899',
  PRODUCTION: '#3B82F6',
  TWEAK: '#F97316',
  DONE: '#22C55E',
  Other: '#71717A',
};

export function UserTimeStatsClient({
  user,
  boards,
}: UserTimeStatsClientProps) {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  const [boardId, setBoardId] = useState<string>('all');
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (boardId && boardId !== 'all') {
      params.set('boardId', boardId);
    }

    if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.set('startDate', weekAgo.toISOString());
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      params.set('startDate', monthAgo.toISOString());
    }

    params.set('limit', '20');

    try {
      const response = await fetch(
        `/api/users/${user.id}/time-logs?${params}`
      );
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch time stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, dateRange, boardId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // Calculate total time for percentage calculation
  const totalPhaseTime =
    stats?.timeByPhase.reduce((sum, p) => sum + p.ms, 0) || 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/users/${user.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-surface-hover overflow-hidden">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || user.email}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-medium text-text-secondary">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-title font-semibold">
                  Time Tracking
                </h1>
                <p className="text-caption text-text-secondary">
                  {user.name || user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={boardId} onValueChange={setBoardId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boards</SelectItem>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as 'week' | 'month' | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-caption font-medium text-text-secondary">
                    Total Time
                  </span>
                  <Clock className="h-4 w-4 text-text-tertiary" />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.totalFormatted || '0h 0m'}
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  {dateRange === 'week'
                    ? 'Last 7 days'
                    : dateRange === 'month'
                    ? 'Last 30 days'
                    : 'All time'}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-caption font-medium text-text-secondary">
                    This Week
                  </span>
                  <Calendar className="h-4 w-4 text-text-tertiary" />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.thisWeekFormatted || '0h 0m'}
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  Current week
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-caption font-medium text-text-secondary">
                    This Month
                  </span>
                  <TrendingUp className="h-4 w-4 text-text-tertiary" />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.thisMonthFormatted || '0h 0m'}
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  Current month
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-caption font-medium text-text-secondary">
                    Work Days
                  </span>
                  <Briefcase className="h-4 w-4 text-text-tertiary" />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.effectiveWorkDays ?? 0}
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  Effective days (8h = 1 day)
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-caption font-medium text-text-secondary">
                    Avg Hours/Day
                  </span>
                  <BarChart3 className="h-4 w-4 text-text-tertiary" />
                </div>
                <div className="text-2xl font-bold">
                  {stats?.avgHoursPerDay ?? 0}h
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  Across {stats?.daysWithLogs ?? 0} active days
                </p>
              </div>
            </div>

            {/* Time by Phase */}
            {stats && stats.timeByPhase.length > 0 && (
              <div className="rounded-lg border border-border bg-surface">
                <div className="p-4 border-b border-border">
                  <h2 className="text-body font-medium">Time by Phase</h2>
                </div>
                <div className="p-4 space-y-3">
                  {stats.timeByPhase
                    .sort((a, b) => b.ms - a.ms)
                    .map((phase) => {
                      const percentage =
                        totalPhaseTime > 0
                          ? Math.round((phase.ms / totalPhaseTime) * 100)
                          : 0;
                      return (
                        <div key={phase.phase} className="space-y-1">
                          <div className="flex items-center justify-between text-caption">
                            <span className="font-medium capitalize">
                              {phase.phase.toLowerCase().replace('_', ' ')}
                            </span>
                            <span className="text-text-secondary">
                              {phase.formatted} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  PHASE_COLORS[phase.phase] || PHASE_COLORS.Other,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Recent Time Logs */}
            <div className="rounded-lg border border-border bg-surface">
              <div className="p-4 border-b border-border">
                <h2 className="text-body font-medium">Recent Time Logs</h2>
              </div>
              <div className="p-4">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-text-tertiary">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No time logs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-caption font-medium text-text-secondary">
                            Date
                          </th>
                          <th className="text-left py-2 px-3 text-caption font-medium text-text-secondary">
                            Card
                          </th>
                          <th className="text-left py-2 px-3 text-caption font-medium text-text-secondary">
                            Board
                          </th>
                          <th className="text-left py-2 px-3 text-caption font-medium text-text-secondary">
                            List
                          </th>
                          <th className="text-right py-2 px-3 text-caption font-medium text-text-secondary">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b border-border last:border-0 hover:bg-surface-hover"
                          >
                            <td className="py-2 px-3">
                              <div className="text-body">
                                {formatDisplayDate(log.startTime)}
                              </div>
                              <div className="text-caption text-text-tertiary">
                                {formatTime(log.startTime)}
                                {log.endTime && ` - ${formatTime(log.endTime)}`}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <Link
                                href={`/boards/${log.card.list.board.id}`}
                                className="text-body text-card-task hover:underline"
                              >
                                {log.card.title}
                              </Link>
                            </td>
                            <td className="py-2 px-3 text-body text-text-secondary">
                              {log.card.list.board.name}
                            </td>
                            <td className="py-2 px-3 text-caption text-text-tertiary">
                              {log.list.name}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="font-medium">
                                {formatDuration(log.durationMs)}
                              </span>
                              {log.isManual && (
                                <span className="ml-1 text-caption text-text-tertiary">
                                  (manual)
                                </span>
                              )}
                              {!log.endTime && (
                                <span className="ml-1 text-caption text-card-task animate-pulse">
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
