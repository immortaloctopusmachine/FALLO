'use client';

import { Folder, Users, Plus, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineMember } from '@/types';

interface CompanyRole {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface ProjectRowData {
  id: string;
  name: string;
  teamColor?: string;
  teamName?: string;
  isExpanded: boolean;
  hasEvents?: boolean;
  members: TimelineMember[];
}

interface TimelineLeftColumnProps {
  projects: ProjectRowData[];
  onToggleProject: (projectId: string) => void;
  onAddBlock?: (projectId: string) => void;
  onAddEvent?: (projectId: string) => void;
  rowHeight: number;
  eventRowHeight?: number;
  roleRowHeight?: number;
  headerHeight: number;
  isAdmin?: boolean;
}

// Get unique roles from project members, sorted by position
function getUniqueRoles(members: TimelineMember[]): CompanyRole[] {
  const rolesMap = new Map<string, CompanyRole>();
  members.forEach(member => {
    member.userCompanyRoles.forEach(ucr => {
      if (!rolesMap.has(ucr.companyRole.id)) {
        rolesMap.set(ucr.companyRole.id, ucr.companyRole);
      }
    });
  });
  return Array.from(rolesMap.values()).sort((a, b) => a.position - b.position);
}

// Count members with a specific role
function getMembersWithRole(members: TimelineMember[], roleId: string): number {
  return members.filter(m =>
    m.userCompanyRoles.some(ucr => ucr.companyRole.id === roleId)
  ).length;
}

export function TimelineLeftColumn({
  projects,
  onToggleProject: _onToggleProject,
  onAddBlock,
  onAddEvent,
  rowHeight,
  eventRowHeight = 28,
  roleRowHeight = 32,
  headerHeight,
  isAdmin = false,
}: TimelineLeftColumnProps) {
  return (
    <div className="flex-shrink-0 w-64 border-r border-border bg-surface">
      {/* Header placeholder to align with date header */}
      <div
        className="sticky top-0 z-30 bg-surface border-b border-border flex items-end px-3 pb-2"
        style={{ height: headerHeight }}
      >
        <span className="text-caption font-medium text-text-secondary">Projects</span>
      </div>

      {/* Project rows */}
      <div>
        {projects.map((project) => {
          const uniqueRoles = getUniqueRoles(project.members);

          return (
            <div key={project.id}>
              {/* Events row label */}
              <div
                className="flex items-center gap-2 px-3 pl-4 border-b border-border-subtle bg-surface-subtle/30"
                style={{ height: eventRowHeight }}
              >
                <Flag className="h-3 w-3 text-text-tertiary" />
                <span className="text-tiny text-text-tertiary">Events</span>
                {isAdmin && onAddEvent && (
                  <button
                    className="ml-auto p-0.5 rounded hover:bg-surface-active text-text-tertiary hover:text-text-primary"
                    onClick={() => onAddEvent(project.id)}
                    title="Add event"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Project header row (blocks row) */}
              <div
                className={cn(
                  'flex items-center gap-2 px-3 border-b border-border-subtle',
                  'hover:bg-surface-hover transition-colors'
                )}
                style={{ height: rowHeight }}
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
                  <span className="text-tiny">{project.members.length}</span>
                </div>

                {isAdmin && onAddBlock && (
                  <button
                    className="p-1 rounded hover:bg-surface-active text-text-tertiary hover:text-text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddBlock(project.id);
                    }}
                    title="Add timeline block"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Role rows (always visible) */}
              {uniqueRoles.map((role) => {
                const memberCount = getMembersWithRole(project.members, role.id);
                if (memberCount === 0) return null;

                return (
                  <div
                    key={role.id}
                    className="flex items-center gap-2 px-3 pl-6 border-b border-border-subtle bg-surface-subtle/50"
                    style={{ height: roleRowHeight }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color || 'var(--text-tertiary)' }}
                    />
                    <span
                      className="text-caption truncate"
                      style={{ color: role.color || 'var(--text-secondary)' }}
                    >
                      {role.name}
                    </span>
                    <span className="text-tiny text-text-tertiary ml-auto">
                      {memberCount}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

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
