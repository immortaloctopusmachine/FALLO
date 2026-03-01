'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { requestBadgeOverlayRefresh } from '@/lib/rewards/client-events';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyLoginRecorder() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const storageKey = `daily-login-recorded:${todayKey()}`;

    if (typeof window !== 'undefined' && window.sessionStorage.getItem(storageKey)) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, '1');
    }

    void apiFetch<{ awardedBadges: Array<{ id: string }> }>('/api/login/record', {
      method: 'POST',
    })
      .then((result) => {
        if (result.awardedBadges.length > 0) {
          void queryClient.invalidateQueries({ queryKey: ['home'] });
          void queryClient.invalidateQueries({ queryKey: ['badges', 'my'] });
          requestBadgeOverlayRefresh();
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey);
        }
      });
  }, [queryClient]);

  return null;
}
