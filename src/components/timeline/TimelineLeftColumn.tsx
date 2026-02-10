'use client';

import { Folder, Users, Flag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TimelineMember } from '@/types';

interface ProjectRowData {
  id: string;
  name: string;
  teamColor?: string;
  teamName?: string;
  isExpanded: boolean;
  hasEvents?: boolean;
  rows: {
    id: string;
    userId: string;
    member: TimelineMember;
    roles: {
      id: string;
      name: string;
      color: string | null;
    }[];
  }[];
}

interface TimelineLeftColumnProps {
  projects: ProjectRowData[];
  onToggleProject: (projectId: string) => void;
  rowHeight: number;
  eventRowHeight?: number;
  userRowHeight?: number;
  headerHeight: number;
  isAdmin?: boolean;
  scrollTop?: number;
}

export function TimelineLeftColumn({
  projects,
  onToggleProject: _onToggleProject,
  rowHeight,
  eventRowHeight = 28,
  userRowHeight = 28,
  headerHeight,
  isAdmin: _isAdmin = false,
  scrollTop = 0,
}: TimelineLeftColumnProps) {
  return (
    <div className="flex-shrink-0 w-64 border-r border-border bg-surface overflow-hidden">
      {/* Header placeholder to align with date header */}
      <div
        className="sticky top-0 z-30 bg-surface border-b border-border flex items-end px-3 pb-2"
        style={{ height: headerHeight }}
      >
        <span className="text-caption font-medium text-text-secondary">Projects</span>
      </div>

      {/* Project rows */}
      <div style={{ transform: `translateY(-${scrollTop}px)` }}>
        {projects.map((project) => (
          <div key={project.id} className="mb-2">
            {/* Events row label */}
            <div
              className="flex items-center gap-2 px-3 pl-4 border-b border-border-subtle bg-surface-subtle/30"
              style={{ height: eventRowHeight }}
            >
              <Flag className="h-3 w-3 text-text-tertiary" />
              <span className="text-tiny text-text-tertiary">Events</span>
            </div>

            {/* Project header row (blocks row) */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 border-b border-border-subtle',
                'hover:bg-surface-hover transition-colors'
              )}
              style={{
                height: rowHeight,
                borderLeftWidth: project.teamColor ? 4 : 0,
                borderLeftColor: project.teamColor || undefined,
              }}
            >
              {project.teamColor && (
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: project.teamColor }}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-body font-medium text-text-primary truncate">
                  {project.name}
                </div>
                {project.teamName && (
                  <div className="text-tiny text-text-tertiary truncate">
                    {project.teamName}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-text-tertiary">
                <Users className="h-3.5 w-3.5" />
                <span className="text-tiny">{project.rows.length}</span>
              </div>
            </div>

            {/* Individual user rows */}
            {project.rows.map((row) => {
              const roles = row.roles || [];

              return (
                <div
                  key={row.userId}
                  className="flex items-center gap-1.5 px-3 pl-5 border-b border-border-subtle bg-surface-subtle/50"
                  style={{ height: userRowHeight }}
                >
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarImage src={row.member.image || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {(row.member.name || row.member.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-caption truncate flex-1 text-text-secondary">
                    {row.member.name || row.member.email}
                  </span>
                  <div className="flex items-center gap-1 max-w-[132px] overflow-hidden">
                    {roles.length === 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium text-text-tertiary bg-surface-hover">
                        No role
                      </span>
                    ) : (
                      roles.map((role) => (
                        <span
                          key={role.id}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate"
                          style={{
                            backgroundColor: `${role.color || 'var(--text-tertiary)'}22`,
                            color: role.color || 'var(--text-tertiary)',
                          }}
                          title={role.name}
                        >
                          {role.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            <div className="h-2 border-b border-border bg-background/70" />
          </div>
        ))}

        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Folder className="h-8 w-8 text-text-tertiary mb-2" />
            <p className="text-body text-text-secondary">No projects</p>
            <p className="text-caption text-text-tertiary">
              Create a board with timeline blocks to see them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
