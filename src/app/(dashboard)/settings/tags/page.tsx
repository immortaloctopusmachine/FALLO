'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsEntityManager, type SettingsEntity } from '@/components/settings/SettingsEntityManager';

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<SettingsEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/tags');
      const data = await response.json();
      if (data.success) {
        setTags(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleAdd = async (data: { name: string; description?: string; color?: string }) => {
    const response = await fetch('/api/settings/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchTags();
    } else {
      alert(result.error?.message || 'Failed to add tag');
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string; color?: string }) => {
    const response = await fetch(`/api/settings/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchTags();
    } else {
      alert(result.error?.message || 'Failed to update tag');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/settings/tags/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success) {
      await fetchTags();
    } else {
      alert(result.error?.message || 'Failed to delete tag');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading tags...</div>
      </div>
    );
  }

  return (
    <SettingsEntityManager
      title="Tags"
      description="Tags can be applied to tasks to categorize and filter work. These are global tags available across all projects."
      entities={tags}
      countLabel="tasks"
      countField="cardTags"
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showColor
    />
  );
}
