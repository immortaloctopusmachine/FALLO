'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsEntityManager, type SettingsEntity } from '@/components/settings/SettingsEntityManager';

export default function EpicNamesSettingsPage() {
  const [epicNames, setEpicNames] = useState<SettingsEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEpicNames = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/epic-names');
      const data = await response.json();
      if (data.success) {
        setEpicNames(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch epic names:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEpicNames();
  }, [fetchEpicNames]);

  const handleAdd = async (data: { name: string; description?: string }) => {
    const response = await fetch('/api/settings/epic-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchEpicNames();
    } else {
      alert(result.error?.message || 'Failed to add epic name');
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string }) => {
    const response = await fetch(`/api/settings/epic-names/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchEpicNames();
    } else {
      alert(result.error?.message || 'Failed to update epic name');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/settings/epic-names/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success) {
      await fetchEpicNames();
    } else {
      alert(result.error?.message || 'Failed to delete epic name');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading epic names...</div>
      </div>
    );
  }

  return (
    <SettingsEntityManager
      title="Epic Names"
      description="Manage reusable epic names for board modules. You can still manually type epic names when creating or using a module."
      entities={epicNames}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showColor={false}
      countField=""
    />
  );
}
