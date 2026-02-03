'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsEntityManager, type SettingsEntity } from '@/components/settings/SettingsEntityManager';

export default function SkillsSettingsPage() {
  const [skills, setSkills] = useState<SettingsEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/skills');
      const data = await response.json();
      if (data.success) {
        setSkills(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleAdd = async (data: { name: string; description?: string; color?: string }) => {
    const response = await fetch('/api/settings/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchSkills();
    } else {
      alert(result.error?.message || 'Failed to add skill');
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string; color?: string }) => {
    const response = await fetch(`/api/settings/skills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchSkills();
    } else {
      alert(result.error?.message || 'Failed to update skill');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/settings/skills/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success) {
      await fetchSkills();
    } else {
      alert(result.error?.message || 'Failed to delete skill');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading skills...</div>
      </div>
    );
  }

  return (
    <SettingsEntityManager
      title="Skills"
      description="Skills represent competencies that can be assigned to users. These are used to match team members to appropriate work."
      entities={skills}
      countLabel="users"
      countField="userSkills"
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showColor
    />
  );
}
