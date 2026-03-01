'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { fireDoneConfetti } from '@/lib/confetti';
import { subscribeToBadgeOverlayRefresh } from '@/lib/rewards/client-events';
import { BadgeMedallion } from '@/components/rewards/BadgeMedallion';

interface BadgeAwardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data: {
    badgeName?: string;
    badgeDescription?: string;
    badgeSlug?: string;
    badgeIconUrl?: string | null;
    badgeCategory?: 'LOGIN' | 'VELOCITY_STREAK' | 'VELOCITY_MILESTONE' | 'QUALITY_CONSISTENCY' | 'QUALITY_VELOCITY_COMBINED' | 'REVIEWER';
    badgeTier?: string | null;
    reason?: string;
  };
}

function stripBadgeTitlePrefix(title: string): string {
  return title.replace(/^Badge earned:\s*/i, '').trim();
}

export function BadgeAwardOverlay() {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<BadgeAwardNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<BadgeAwardNotification | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const fetchBadgeNotifications = useCallback(async () => {
    try {
      const result = await apiFetch<{ notifications: BadgeAwardNotification[]; unreadCount: number }>(
        '/api/notifications?unreadOnly=true&limit=10&type=badge_awarded'
      );

      const incoming = [...result.notifications].reverse().filter((notification) => {
        if (notification.type !== 'badge_awarded') return false;
        if (notification.read) return false;
        if (seenIdsRef.current.has(notification.id)) return false;
        return true;
      });

      if (incoming.length === 0) return;

      for (const notification of incoming) {
        seenIdsRef.current.add(notification.id);
      }

      void queryClient.invalidateQueries({ queryKey: ['home'] });
      void queryClient.invalidateQueries({ queryKey: ['badges', 'my'] });
      setQueue((previous) => [...previous, ...incoming]);
    } catch {
      // Decorative UX only.
    }
  }, [queryClient]);

  useEffect(() => {
    void fetchBadgeNotifications();

    let intervalId: number | null = null;
    const startPolling = () => {
      if (!intervalId) intervalId = window.setInterval(fetchBadgeNotifications, 20_000);
    };
    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
        return;
      }
      void fetchBadgeNotifications();
      startPolling();
    };

    const handleFocus = () => {
      void fetchBadgeNotifications();
    };

    if (document.visibilityState !== 'hidden') {
      startPolling();
    }

    const unsubscribe = subscribeToBadgeOverlayRefresh(() => {
      void fetchBadgeNotifications();
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBadgeNotifications]);

  useEffect(() => {
    if (activeNotification || queue.length === 0) return;

    const [nextNotification, ...rest] = queue;
    setActiveNotification(nextNotification);
    setQueue(rest);
  }, [activeNotification, queue]);

  useEffect(() => {
    if (!activeNotification) return;
    fireDoneConfetti();
  }, [activeNotification]);

  const dismissActiveNotification = useCallback(() => {
    if (!activeNotification) return;

    const dismissedId = activeNotification.id;
    setActiveNotification(null);

    void apiFetch(`/api/notifications/${dismissedId}`, {
      method: 'PATCH',
    }).catch(() => {
      // Ignore read-state sync failures.
    });
  }, [activeNotification]);

  useEffect(() => {
    if (!activeNotification) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissActiveNotification();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNotification, dismissActiveNotification]);

  const badge = useMemo(() => {
    if (!activeNotification) return null;

    return {
      name: activeNotification.data.badgeName || stripBadgeTitlePrefix(activeNotification.title),
      description: activeNotification.data.badgeDescription || activeNotification.message,
      category: activeNotification.data.badgeCategory || 'LOGIN',
      tier: activeNotification.data.badgeTier || null,
      iconUrl: activeNotification.data.badgeIconUrl || null,
    };
  }, [activeNotification]);

  if (!activeNotification || !badge) return null;

  const reason = activeNotification.data.reason || activeNotification.message;

  return (
    <div className="pointer-events-none fixed inset-0 z-[140]">
      <button
        type="button"
        aria-label="Close badge reward popup"
        className="pointer-events-auto absolute inset-0 bg-transparent"
        onClick={dismissActiveNotification}
      />

      <div className="pointer-events-auto absolute left-1/2 top-20 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col items-center gap-3">
        <button
          type="button"
          onClick={dismissActiveNotification}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-surface/85 text-text-primary shadow-lg backdrop-blur hover:bg-surface"
          aria-label="Close badge reward popup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pt-3">
          <BadgeMedallion badge={badge} size="xl" />
        </div>

        <div className="w-full rounded-2xl border border-white/12 bg-surface/90 px-4 py-3 text-center shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
            Badge Unlocked
          </div>
          <div className="mt-1 text-lg font-semibold text-text-primary">
            {badge.name}
          </div>
          <div className="mt-1 text-sm text-text-secondary">
            {reason}
          </div>
        </div>
      </div>
    </div>
  );
}
