'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsEntityManager, type SettingsEntity } from '@/components/settings/SettingsEntityManager';

export default function BlockTypesSettingsPage() {
  const [blockTypes, setBlockTypes] = useState<SettingsEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBlockTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/block-types');
      const data = await response.json();
      if (data.success) {
        setBlockTypes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch block types:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockTypes();
  }, [fetchBlockTypes]);

  const handleAdd = async (data: { name: string; description?: string; color?: string }) => {
    const response = await fetch('/api/settings/block-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchBlockTypes();
    } else {
      alert(result.error?.message || 'Failed to add block type');
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string; color?: string }) => {
    const response = await fetch(`/api/settings/block-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchBlockTypes();
    } else {
      alert(result.error?.message || 'Failed to update block type');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/settings/block-types/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success) {
      await fetchBlockTypes();
    } else {
      alert(result.error?.message || 'Failed to delete block type');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading block types...</div>
      </div>
    );
  }

  return (
    <SettingsEntityManager
      title="Block Types"
      description="Block types define the phases in your project timeline. Each block represents a specific type of work (e.g., Concept, Production, QA)."
      entities={blockTypes}
      countLabel="blocks"
      countField="blocks"
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showColor
    />
  );
}
