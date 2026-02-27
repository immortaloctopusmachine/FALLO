'use client';

import { useCallback, useState } from 'react';
import type { Studio, User } from '@/types';

export const TEAM_COLORS = [
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316',
];

export type TeamPickerUser = Pick<User, 'id' | 'name' | 'email' | 'image'>;

export function useTeamReferenceData() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [users, setUsers] = useState<TeamPickerUser[]>([]);

  const fetchStudios = useCallback(async () => {
    try {
      const response = await fetch('/api/studios');
      const data = await response.json();
      if (data.success) {
        setStudios(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch studios:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users?scope=picker');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    await Promise.all([fetchStudios(), fetchUsers()]);
  }, [fetchStudios, fetchUsers]);

  return {
    studios,
    users,
    loadReferenceData,
  };
}
