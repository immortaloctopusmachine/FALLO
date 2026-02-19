'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Layers, FileText, Calendar, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { snapToMonday } from '@/lib/list-templates';
import { formatDateInput } from '@/lib/date-utils';
import type {
  Team,
  CoreProjectTemplate,
  TimelineData,
  TimelineArchivedProjectSummary,
  BlockType,
  EventType,
} from '@/types';
import { cn } from '@/lib/utils';

// Check if a date is Monday
function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

interface SelectedMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  companyRoles: {
    id: string;
    name: string;
    color: string | null;
  }[];
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
}

interface TimelineQueryData {
  projects: TimelineData[];
  archivedProjects: TimelineArchivedProjectSummary[];
  teams: Team[];
  users: { id: string; name: string | null; email: string; image: string | null }[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
}

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: Date;
  teams: Team[];
}

async function parseApiResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as { success?: boolean; data?: { id: string }; error?: { message?: string } };
  } catch {
    throw new Error(
      text.startsWith('<!DOCTYPE')
        ? 'Server returned HTML instead of JSON. Please refresh and try again.'
        : 'Invalid server response'
    );
  }
}

export function CreateProjectDialog({
  isOpen,
  onClose,
  defaultStartDate,
  teams,
}: CreateProjectDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [coreTemplates, setCoreTemplates] = useState<CoreProjectTemplate[]>([]);
  const [selectedCoreTemplateId, setSelectedCoreTemplateId] = useState<string>('');
  const [isLoadingCoreTemplates, setIsLoadingCoreTemplates] = useState(false);
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState<string | null>(null);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [productionTitle, setProductionTitle] = useState('');
  const [memberRoleAssignments, setMemberRoleAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Member selection state
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [allUsers, setAllUsers] = useState<SelectedMember[]>([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);
  const [teamMembersCache, setTeamMembersCache] = useState<Record<string, SelectedMember[]>>({});
  const [teamLoadStatus, setTeamLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [teamLoadMessage, setTeamLoadMessage] = useState<string | null>(null);
  const teamMemberRequestIdRef = useRef(0);

  // Set default start date when provided (snap to Monday)
  useEffect(() => {
    if (defaultStartDate) {
      const monday = snapToMonday(defaultStartDate);
      setStartDate(formatDateInput(monday));
    }
  }, [defaultStartDate]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      if (defaultStartDate) {
        const monday = snapToMonday(defaultStartDate);
        setStartDate(formatDateInput(monday));
      } else {
        setStartDate('');
      }
      setProductionTitle('');
      setMemberRoleAssignments({});
      setSelectedTeamId('');
      setSelectedCoreTemplateId(coreTemplates[0]?.id || '');
      setSelectedProjectTemplate(null);
      setSelectedMembers([]);
      setIsLoadingUsers(false);
      setIsLoadingTeamMembers(false);
      setTeamLoadStatus('idle');
      setTeamLoadMessage(null);
      setError(null);
    }
  }, [isOpen, defaultStartDate, coreTemplates]);

  // Fetch all users when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingUsers(true);
      fetch('/api/users?scope=picker')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setAllUsers(
              data.data.map((u: {
                id: string;
                name: string | null;
                email: string;
                image: string | null;
                userCompanyRoles?: { companyRole: { id: string; name: string; color: string | null } }[];
              }) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                image: u.image,
                companyRoles: (u.userCompanyRoles || []).map(
                  (ucr: { companyRole: { id: string; name: string; color: string | null } }) => ucr.companyRole
                ),
              }))
            );
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingUsers(false));
    }
  }, [isOpen]);

  // Fetch project templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingTemplates(true);
      fetch('/api/boards?templates=true')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const templates = data.data
              .filter((b: { isTemplate?: boolean }) => b.isTemplate)
              .map((b: { id: string; name: string; description: string | null; lists: unknown[] }) => ({
                id: b.id,
                name: b.name,
                description: b.description,
                listCount: b.lists?.length || 0,
              }));
            setProjectTemplates(templates);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingTemplates(false));
    }
  }, [isOpen]);

  // Fetch core templates when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingCoreTemplates(true);
    fetch('/api/settings/core-project-templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.templates) {
          const templates = data.data.templates as CoreProjectTemplate[];
          setCoreTemplates(templates);
          if (templates.length > 0) {
            setSelectedCoreTemplateId((prev) => prev || templates[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingCoreTemplates(false));
  }, [isOpen]);

  // When team changes, auto-populate with team members
  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setMemberRoleAssignments({});
    const selectedTeamName = teams.find((team) => team.id === teamId)?.name || 'team';

    if (!teamId) {
      setSelectedMembers([]);
      setIsLoadingTeamMembers(false);
      setTeamLoadStatus('idle');
      setTeamLoadMessage(null);
      return;
    }

    const cachedMembers = teamMembersCache[teamId];
    if (cachedMembers) {
      setSelectedMembers(cachedMembers);
      setIsLoadingTeamMembers(false);
      setTeamLoadStatus('loaded');
      setTeamLoadMessage(
        `Loaded ${cachedMembers.length} team member${cachedMembers.length === 1 ? '' : 's'} for ${selectedTeamName}.`
      );
      return;
    }

    setSelectedMembers([]);
    setIsLoadingTeamMembers(true);
    setTeamLoadStatus('loading');
    setTeamLoadMessage(`Loading team members for ${selectedTeamName}...`);
    const requestId = ++teamMemberRequestIdRef.current;

    try {
      const response = await fetch(`/api/teams/${teamId}/members?scope=ids`);
      const data = await response.json();
      if (requestId !== teamMemberRequestIdRef.current) return;

      if (data.success && data.data) {
        const memberIds = (data.data as { userId: string }[]).map((member) => member.userId);
        const usersById = new Map(allUsers.map((user) => [user.id, user]));
        let teamMembers = memberIds
          .map((memberId) => usersById.get(memberId))
          .filter((member): member is SelectedMember => Boolean(member));

        if (teamMembers.length !== memberIds.length) {
          const fallbackResponse = await fetch(`/api/teams/${teamId}/members?scope=picker`);
          const fallbackData = await fallbackResponse.json();
          if (requestId !== teamMemberRequestIdRef.current) return;

          if (fallbackData.success && fallbackData.data) {
            teamMembers = fallbackData.data.map(
              (m: {
                user: {
                  id: string;
                  name: string | null;
                  email: string;
                  image: string | null;
                  userCompanyRoles?: { companyRole: { id: string; name: string; color: string | null } }[];
                };
              }) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                companyRoles: (m.user.userCompanyRoles || []).map(
                  (ucr: { companyRole: { id: string; name: string; color: string | null } }) => ucr.companyRole
                ),
              })
            );
          }
        }

        setSelectedMembers(teamMembers);
        setTeamMembersCache((prev) => ({
          ...prev,
          [teamId]: teamMembers,
        }));
        setTeamLoadStatus('loaded');
        setTeamLoadMessage(
          `Loaded ${teamMembers.length} team member${teamMembers.length === 1 ? '' : 's'} for ${selectedTeamName}.`
        );
      } else {
        setTeamLoadStatus('error');
        setTeamLoadMessage(`Failed to load team members for ${selectedTeamName}.`);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      if (requestId === teamMemberRequestIdRef.current) {
        setTeamLoadStatus('error');
        setTeamLoadMessage(`Failed to load team members for ${selectedTeamName}.`);
      }
    } finally {
      if (requestId === teamMemberRequestIdRef.current) {
        setIsLoadingTeamMembers(false);
      }
    }
  };

  const handleAddUser = (user: SelectedMember) => {
    setSelectedMembers(prev => [...prev, user]);
    setAddUserOpen(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const selectedMemberIds = selectedMembers.map(m => m.id);
  const availableUsers = allUsers.filter(u => !selectedMemberIds.includes(u.id));

  const handleSelectProjectTemplate = (templateId: string) => {
    setSelectedProjectTemplate(templateId);
    setSelectedCoreTemplateId('');
  };

  const handleSelectCoreTemplate = (templateId: string) => {
    setSelectedCoreTemplateId(templateId);
    setSelectedProjectTemplate(null);
  };

  const upsertTimelineProject = (project: TimelineData) => {
    queryClient.setQueryData<TimelineQueryData | undefined>(['timeline'], (previous) => {
      if (!previous) return previous;

      const projects = [
        ...previous.projects.filter((existingProject) => existingProject.board.id !== project.board.id),
        project,
      ].sort((a, b) => a.board.name.localeCompare(b.board.name));

      return {
        ...previous,
        projects,
      };
    });
  };

  const buildOptimisticTimelineProject = (projectId: string): TimelineData => {
    const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;

    const projectRoleAssignments = Object.entries(memberRoleAssignments)
      .filter(([, roleId]) => roleId)
      .flatMap(([userId, roleId]) => {
        const member = selectedMembers.find((m) => m.id === userId);
        const role = member?.companyRoles.find((r) => r.id === roleId);
        if (!member || !role) return [];

        return [
          {
            id: `${projectId}-${userId}-${roleId}`,
            roleId,
            roleName: role.name,
            roleColor: role.color || null,
            userId,
          },
        ];
      });

    return {
      board: {
        id: projectId,
        name: name.trim(),
        productionTitle: productionTitle.trim() || null,
        description: null,
        teamId: selectedTeam?.id || null,
        team: selectedTeam
          ? {
              id: selectedTeam.id,
              name: selectedTeam.name,
              color: selectedTeam.color,
            }
          : null,
        members: selectedMembers.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          image: member.image,
          userCompanyRoles: member.companyRoles.map((role) => ({
            companyRole: {
              id: role.id,
              name: role.name,
              color: role.color,
              position: 0,
            },
          })),
        })),
        projectRoleAssignments,
      },
      blocks: [],
      events: [],
      availability: [],
    };
  };

  const hydrateTimelineCache = async (projectId: string) => {
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}`);
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { project?: TimelineData };
      };
      const createdProject = payload.success ? payload.data?.project : null;
      if (!createdProject) return;
      upsertTimelineProject(createdProject);
    } catch (error) {
      console.error('Failed to hydrate timeline cache after project creation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;

      const memberIds = selectedMembers.length > 0
        ? selectedMembers.map(m => m.id)
        : undefined;

      // Build initial settings from dialog fields
      const initialSettings: Record<string, unknown> = {};
      if (productionTitle.trim()) {
        initialSettings.productionTitle = productionTitle.trim();
      }
      // Build projectRoleAssignments from per-member role selections
      const roleAssignments = Object.entries(memberRoleAssignments)
        .filter(([, roleId]) => roleId)
        .map(([userId, roleId]) => {
          const member = selectedMembers.find(m => m.id === userId);
          const role = member?.companyRoles.find(r => r.id === roleId);
          return {
            id: `${userId}-${roleId}`,
            roleId,
            roleName: role?.name || '',
            roleColor: role?.color || null,
            userId,
          };
        });
      if (roleAssignments.length > 0) {
        initialSettings.projectRoleAssignments = roleAssignments;
      }

      const settingsPayload = Object.keys(initialSettings).length > 0
        ? initialSettings
        : undefined;

      if (selectedProjectTemplate) {
        // Clone from project template
        response = await fetch(`/api/boards/${selectedProjectTemplate}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            asTemplate: false,
            startDate: startDate || undefined,
            teamId: selectedTeamId || undefined,
            memberIds,
            settings: settingsPayload,
          }),
        });
      } else {
        // Create new board with list template
        response = await fetch('/api/boards?response=minimal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            coreTemplateId: selectedCoreTemplateId || undefined,
            startDate: startDate || undefined,
            teamId: selectedTeamId || undefined,
            memberIds,
            settings: settingsPayload,
          }),
        });
      }

      const data = await parseApiResponse(response);

      if (!data.success || !data.data?.id) {
        setError(data.error?.message || 'Failed to create project');
        return;
      }

      upsertTimelineProject(buildOptimisticTimelineProject(data.data.id));
      void hydrateTimelineCache(data.data.id);
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      onClose();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project on the timeline using a core template (or clone from a project template).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Working Title + Production Title (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Working Title <span className="text-error">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Internal project name..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productionTitle">Production Title</Label>
              <Input
                id="productionTitle"
                value={productionTitle}
                onChange={(e) => setProductionTitle(e.target.value)}
                placeholder="Set later when approved"
              />
              <p className="text-caption text-text-tertiary">
                Optional. Set when the final game name is approved.
              </p>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date (Monday) <span className="text-error">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  // Always snap to Monday
                  const monday = snapToMonday(selectedDate);
                  setStartDate(formatDateInput(monday));
                }}
                className={cn("pl-10", !startDate && "border-warning")}
                required
              />
            </div>
            {startDate && !isMonday(new Date(startDate + 'T00:00:00')) && (
              <p className="text-caption text-warning">
                Date will be adjusted to the nearest Monday.
              </p>
            )}
            <p className="text-caption text-text-tertiary">
              Projects start on Mondays to align with weekly planning blocks. Planning lists will be calculated as 5-day work weeks (Mon-Fri).
            </p>
          </div>

          {/* Team + Members (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label htmlFor="team">Team (optional)</Label>
              <select
                id="team"
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-body shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">No team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Members */}
            <div className="space-y-2">
              <Label>Members</Label>

              {/* Add user */}
              <Popover open={addUserOpen} onOpenChange={setAddUserOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={isLoadingTeamMembers || isLoadingUsers}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="text-text-tertiary">Add user...</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users available.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map(user => (
                          <CommandItem
                            key={user.id}
                            value={user.name || user.email}
                            onSelect={() => handleAddUser(user)}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="text-tiny">
                                {(user.name || user.email)[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.name || 'Unnamed'}</span>
                              <span className="text-tiny text-text-tertiary">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {teamLoadStatus === 'loading' && (
                <p className="text-caption text-text-tertiary">{teamLoadMessage || 'Loading team members...'}</p>
              )}
              {teamLoadStatus === 'loaded' && (
                <p className="text-caption text-success">{teamLoadMessage}</p>
              )}
              {teamLoadStatus === 'error' && (
                <p className="text-caption text-error">{teamLoadMessage || 'Failed to load team members.'}</p>
              )}
              {teamLoadStatus === 'idle' && selectedMembers.length === 0 && (
                <p className="text-caption text-text-tertiary">
                  Select a team to auto-populate, or add manually.
                </p>
              )}
            </div>
          </div>

          {/* Selected members list (full width, with role selector) */}
          {selectedMembers.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
              <div className="divide-y divide-border">
                {selectedMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback className="text-tiny">
                          {(member.name || member.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-body truncate">
                        {member.name || member.email}
                      </span>
                      {member.companyRoles.map(role => (
                        <span
                          key={role.id}
                          className="px-1.5 py-0.5 rounded-full text-tiny font-medium flex-shrink-0"
                          style={{
                            backgroundColor: `${role.color || '#71717a'}20`,
                            color: role.color || '#71717a',
                          }}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Per-member project role selector */}
                      {member.companyRoles.length > 0 && (
                        <select
                          value={memberRoleAssignments[member.id] || ''}
                          onChange={(e) =>
                            setMemberRoleAssignments(prev => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                          className="h-7 rounded-md border border-input bg-background px-2 text-caption shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">No project role</option>
                          {member.companyRoles.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(member.id)}
                        className="p-1 rounded-md text-text-tertiary hover:text-red-500 hover:bg-red-500/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Core Template</Label>
            <div className="grid grid-cols-2 gap-2">
                {coreTemplates.map((tmpl) => {
                  const isSelected = selectedCoreTemplateId === tmpl.id && !selectedProjectTemplate;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectCoreTemplate(tmpl.id)}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                        isSelected
                          ? 'border-success bg-success/10'
                          : 'border-border hover:border-success/50 hover:bg-surface-hover'
                      )}
                    >
                      <Layers className={cn(
                        'h-5 w-5 mt-0.5 shrink-0',
                        isSelected ? 'text-success' : 'text-text-tertiary'
                      )} />
                      <div>
                        <div className={cn(
                          'font-medium text-body',
                          isSelected ? 'text-success' : 'text-text-primary'
                        )}>
                          {tmpl.name}
                        </div>
                        <div className="text-caption text-text-tertiary mt-0.5">
                          {tmpl.blocks.length} blocks, {tmpl.events.length} events
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
            {isLoadingCoreTemplates && coreTemplates.length === 0 && (
              <div className="text-caption text-text-tertiary">Loading core templates...</div>
            )}
            {!isLoadingCoreTemplates && coreTemplates.length === 0 && (
              <div className="text-caption text-warning">
                No core templates found. Create one in Settings {'>'} Core Templates.
              </div>
            )}

            {/* Project Templates */}
            {projectTemplates.length > 0 && (
              <div className="mt-3">
                <div className="text-caption text-text-secondary mb-2">From Project Template</div>
                <div className="grid grid-cols-2 gap-2">
                  {projectTemplates.map((pt) => {
                    const isSelected = selectedProjectTemplate === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => handleSelectProjectTemplate(pt.id)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                          isSelected
                            ? 'border-success bg-success/10'
                            : 'border-border hover:border-success/50 hover:bg-surface-hover'
                        )}
                      >
                        <FileText className={cn(
                          'h-5 w-5 mt-0.5 shrink-0',
                          isSelected ? 'text-success' : 'text-text-tertiary'
                        )} />
                        <div>
                          <div className={cn(
                            'font-medium text-body truncate',
                            isSelected ? 'text-success' : 'text-text-primary'
                          )}>
                            {pt.name}
                          </div>
                          <div className="text-caption text-text-tertiary mt-0.5">
                            {pt.listCount} lists
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isLoadingTemplates && projectTemplates.length === 0 && (
              <div className="text-caption text-text-tertiary">Loading templates...</div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-caption text-error">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !name.trim() ||
                !startDate ||
                (!selectedProjectTemplate && !selectedCoreTemplateId)
              }
            >
              {isLoading ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
