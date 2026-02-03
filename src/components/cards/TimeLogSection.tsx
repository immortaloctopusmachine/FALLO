'use client';

import { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TimeLog {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  isManual: boolean;
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  list: {
    id: string;
    name: string;
  };
}

interface TimeLogSectionProps {
  boardId: string;
  cardId: string;
  listId: string;
  isAdmin?: boolean;
  currentUserId?: string;
}

export function TimeLogSection({
  boardId,
  cardId,
  listId,
  isAdmin = false,
  currentUserId,
}: TimeLogSectionProps) {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [, setTotalMs] = useState(0);
  const [totalFormatted, setTotalFormatted] = useState('0m');
  const [isLoading, setIsLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch time logs
  useEffect(() => {
    fetchTimeLogs();
  }, [boardId, cardId]);

  const fetchTimeLogs = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/time-logs`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotalMs(data.data.totalMs);
        setTotalFormatted(data.data.totalFormatted);
        // Find any active (in-progress) log for current user
        const active = data.data.logs.find(
          (log: TimeLog) => !log.endTime && log.user.id === currentUserId
        );
        setActiveLog(active || null);
      }
    } catch (error) {
      console.error('Failed to fetch time logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/time-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          listId,
          startTime: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveLog(data.data);
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStopTimer = async () => {
    if (!activeLog) return;

    try {
      const endTime = new Date();
      const startTime = new Date(activeLog.startTime);
      const durationMs = endTime.getTime() - startTime.getTime();

      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/time-logs/${activeLog.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endTime: endTime.toISOString(),
            durationMs,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setActiveLog(null);
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handleAddManualTime = async () => {
    if (!currentUserId) return;

    const hours = parseInt(manualHours || '0');
    const minutes = parseInt(manualMinutes || '0');
    const durationMs = (hours * 60 + minutes) * 60 * 1000;

    if (durationMs <= 0) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - durationMs);

      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/time-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          listId,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          durationMs,
          notes: manualNotes.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddDialog(false);
        setManualHours('');
        setManualMinutes('');
        setManualNotes('');
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Failed to add manual time:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Delete this time entry?')) return;

    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/time-logs/${logId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        fetchTimeLogs();
      }
    } catch (error) {
      console.error('Failed to delete time log:', error);
    }
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Tracked
        </Label>
        <div className="text-caption text-text-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Time Tracked
      </Label>

      {/* Total time */}
      <div className="rounded-md border border-border-subtle bg-surface p-3">
        <div className="flex items-center justify-between">
          <span className="text-body text-text-tertiary">Total</span>
          <span className="font-semibold text-text-primary">{totalFormatted}</span>
        </div>
      </div>

      {/* Timer controls */}
      <div className="flex gap-2">
        {activeLog ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-error text-error hover:bg-error/10"
            onClick={handleStopTimer}
          >
            <Square className="mr-1.5 h-3 w-3" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-success text-success hover:bg-success/10"
            onClick={handleStartTimer}
          >
            <Play className="mr-1.5 h-3 w-3" />
            Start
          </Button>
        )}

        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Time Manually</DialogTitle>
                <DialogDescription>
                  Add a manual time entry for this task.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-caption">Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-caption">Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-caption">Notes (optional)</Label>
                  <Input
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Add a note..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddManualTime}
                    disabled={isSubmitting || (!manualHours && !manualMinutes)}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Time'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active timer indicator */}
      {activeLog && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-2 text-caption">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-success">Timer running...</span>
        </div>
      )}

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="space-y-1 pt-2">
          <span className="text-tiny text-text-tertiary">Recent entries</span>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-center justify-between rounded px-2 py-1 text-tiny',
                  log.isManual ? 'bg-surface-hover' : 'bg-surface'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-text-tertiary shrink-0">
                    {formatDate(log.startTime)}
                  </span>
                  <span className="truncate text-text-secondary">
                    {log.user.name || log.user.email.split('@')[0]}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-medium">
                    {log.durationMs ? formatDuration(log.durationMs) : '...'}
                  </span>
                  {isAdmin && log.endTime && (
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-0.5 text-text-tertiary hover:text-error"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
