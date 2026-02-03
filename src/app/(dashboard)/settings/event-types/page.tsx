'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsEntityManager, type SettingsEntity } from '@/components/settings/SettingsEntityManager';

export default function EventTypesSettingsPage() {
  const [eventTypes, setEventTypes] = useState<SettingsEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEventTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/event-types');
      const data = await response.json();
      if (data.success) {
        setEventTypes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch event types:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  const handleAdd = async (data: { name: string; description?: string; color?: string }) => {
    const response = await fetch('/api/settings/event-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchEventTypes();
    } else {
      alert(result.error?.message || 'Failed to add event type');
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string; color?: string }) => {
    const response = await fetch(`/api/settings/event-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchEventTypes();
    } else {
      alert(result.error?.message || 'Failed to update event type');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/settings/event-types/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success) {
      await fetchEventTypes();
    } else {
      alert(result.error?.message || 'Failed to delete event type');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading event types...</div>
      </div>
    );
  }

  return (
    <SettingsEntityManager
      title="Event Types"
      description="Event types define milestones and deadlines on the timeline. Each event marks an important date or period in your project."
      entities={eventTypes}
      countLabel="events"
      countField="events"
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showColor
    />
  );
}
