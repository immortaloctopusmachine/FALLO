'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BlockType, EventType, Team, User } from '@/types';

interface TimelineFilters {
  teams: string[];
  users: string[];
  blockTypes: string[];
  eventTypes: string[];
}

interface TimelineFilterPanelProps {
  teams: Team[];
  users: Pick<User, 'id' | 'name' | 'email' | 'image'>[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
  filters: TimelineFilters;
  onFiltersChange: (filters: TimelineFilters) => void;
  onClose: () => void;
}

export function TimelineFilterPanel({
  teams,
  users,
  blockTypes,
  eventTypes,
  filters,
  onFiltersChange,
  onClose,
}: TimelineFilterPanelProps) {
  const toggleFilter = (
    type: keyof TimelineFilters,
    id: string
  ) => {
    const current = filters[type];
    const updated = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    onFiltersChange({ ...filters, [type]: updated });
  };

  const clearFilters = () => {
    onFiltersChange({
      teams: [],
      users: [],
      blockTypes: [],
      eventTypes: [],
    });
  };

  const hasFilters =
    filters.teams.length > 0 ||
    filters.users.length > 0 ||
    filters.blockTypes.length > 0 ||
    filters.eventTypes.length > 0;

  return (
    <div className="w-72 border-l border-border bg-surface overflow-y-auto">
      <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <h3 className="text-body font-medium">Filters</h3>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-caption">
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Teams */}
        {teams.length > 0 && (
          <div className="space-y-2">
            <Label className="text-caption text-text-secondary">Teams</Label>
            <div className="space-y-1">
              {teams.map((team) => (
                <label
                  key={team.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <Checkbox
                    checked={filters.teams.includes(team.id)}
                    onCheckedChange={() => toggleFilter('teams', team.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-caption">{team.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {users.length > 0 && (
          <div className="space-y-2">
            <Label className="text-caption text-text-secondary">Users</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <Checkbox
                    checked={filters.users.includes(user.id)}
                    onCheckedChange={() => toggleFilter('users', user.id)}
                  />
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-tiny">
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-caption truncate">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Block Types */}
        {blockTypes.length > 0 && (
          <div className="space-y-2">
            <Label className="text-caption text-text-secondary">Block Types</Label>
            <div className="space-y-1">
              {blockTypes.map((type) => (
                <label
                  key={type.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <Checkbox
                    checked={filters.blockTypes.includes(type.id)}
                    onCheckedChange={() => toggleFilter('blockTypes', type.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-caption">{type.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Event Types */}
        {eventTypes.length > 0 && (
          <div className="space-y-2">
            <Label className="text-caption text-text-secondary">Event Types</Label>
            <div className="space-y-1">
              {eventTypes.map((type) => (
                <label
                  key={type.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <Checkbox
                    checked={filters.eventTypes.includes(type.id)}
                    onCheckedChange={() => toggleFilter('eventTypes', type.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-caption">{type.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
