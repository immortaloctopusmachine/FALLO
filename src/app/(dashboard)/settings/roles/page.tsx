'use client';

import { useState, useEffect, useCallback } from 'react';
import { SettingsEntityManager, type SettingsEntity } from '@/components/settings/SettingsEntityManager';

export default function RolesSettingsPage() {
  const [roles, setRoles] = useState<SettingsEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/roles');
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleAdd = async (data: { name: string; description?: string; color?: string }) => {
    const response = await fetch('/api/settings/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchRoles();
    } else {
      alert(result.error?.message || 'Failed to add role');
    }
  };

  const handleUpdate = async (id: string, data: { name?: string; description?: string; color?: string }) => {
    const response = await fetch(`/api/settings/roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success) {
      await fetchRoles();
    } else {
      alert(result.error?.message || 'Failed to update role');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/settings/roles/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (result.success) {
      await fetchRoles();
    } else {
      alert(result.error?.message || 'Failed to delete role');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading roles...</div>
      </div>
    );
  }

  return (
    <SettingsEntityManager
      title="Roles"
      description="Company roles represent job functions (PO, Lead, Artist, etc.) that can be assigned to users. Users can have multiple roles."
      entities={roles}
      countLabel="users"
      countField="userCompanyRoles"
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showColor
    />
  );
}
