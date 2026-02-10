'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ExternalLink,
  Users,
  Calendar,
  UserPlus,
  X,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';
import type { BoardSettings } from '@/types';

interface CompanyRoleInfo {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface MemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  userCompanyRoles: {
    companyRole: CompanyRoleInfo;
  }[];
}

interface ProjectMember {
  id: string;
  permission: string;
  user: MemberUser;
}

interface TeamInfo {
  id: string;
  name: string;
  color: string;
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface ProjectRoleAssignment {
  id: string;
  roleId: string;
  roleName: string;
  roleColor?: string | null;
  userId: string;
}

interface ProjectDetailClientProps {
  board: {
    id: string;
    name: string;
    teamId: string | null;
    team: TeamInfo | null;
    settings: BoardSettings;
    members: ProjectMember[];
  };
  teams: TeamInfo[];
  companyRoles: CompanyRoleInfo[];
  isAdmin: boolean;
}

export function ProjectDetailClient({
  board,
  teams,
  companyRoles,
  isAdmin,
}: ProjectDetailClientProps) {
  const router = useRouter();

  // Team state
  const [teamId, setTeamId] = useState<string | null>(board.teamId);
  const [teamOpen, setTeamOpen] = useState(false);

  // Member state
  const [members, setMembers] = useState<ProjectMember[]>(board.members);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [usersOpen, setUsersOpen] = useState(false);

  // Date state
  const [startDate, setStartDate] = useState(board.settings.projectStartDate || '');
  const [lastTweak, setLastTweak] = useState(board.settings.lastDayAnimationTweaks || '');
  const [releaseDate, setReleaseDate] = useState(board.settings.releaseDate || '');
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [projectRoleAssignments, setProjectRoleAssignments] = useState<ProjectRoleAssignment[]>(
    board.settings.projectRoleAssignments || []
  );
  const [newRoleId, setNewRoleId] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [isSavingProjectRoles, setIsSavingProjectRoles] = useState(false);

  const selectedTeam = teams.find(t => t.id === teamId);
  const memberUserIds = members.map(m => m.user.id);
  const availableUsers = users.filter(u => !memberUserIds.includes(u.id));
  const membersById = members.reduce<Record<string, ProjectMember['user']>>((acc, member) => {
    acc[member.user.id] = member.user;
    return acc;
  }, {});

  // Fetch users for add member dropdown
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    setProjectRoleAssignments(board.settings.projectRoleAssignments || []);
  }, [board.settings.projectRoleAssignments]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Handle team change
  const handleTeamChange = async (newTeamId: string | null) => {
    setTeamId(newTeamId);
    setTeamOpen(false);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: newTeamId }),
      });
      const data = await response.json();
      if (!data.success) {
        setTeamId(board.teamId); // revert
      } else {
        router.refresh();
      }
    } catch {
      setTeamId(board.teamId); // revert
    }
  };

  // Handle add member
  const handleAddMember = async (userEmail: string) => {
    setUsersOpen(false);
    try {
      const response = await fetch(`/api/boards/${board.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, permission: 'MEMBER' }),
      });
      const data = await response.json();
      if (data.success) {
        // Refetch to get full user with company roles
        router.refresh();
        // Optimistically add the member (without roles, will be fixed on refresh)
        const addedUser = users.find(u => u.email === userEmail);
        if (addedUser) {
          setMembers(prev => [
            ...prev,
            {
              id: data.data.id,
              permission: 'MEMBER',
              user: { ...addedUser, userCompanyRoles: [] },
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(
        `/api/boards/${board.id}/members?memberId=${memberId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // Handle save dates
  const handleSaveDates = async () => {
    setIsSavingDates(true);
    try {
      const updatedSettings: BoardSettings = {
        ...board.settings,
        projectStartDate: startDate || undefined,
        lastDayAnimationTweaks: lastTweak || undefined,
        releaseDate: releaseDate || undefined,
      };

      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to save dates:', err);
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleAddProjectRoleRow = () => {
    if (!newRoleId || !newUserId) return;
    const role = companyRoles.find((r) => r.id === newRoleId);
    if (!role) return;

    const rowId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setProjectRoleAssignments((prev) => [
      ...prev,
      {
        id: rowId,
        roleId: role.id,
        roleName: role.name,
        roleColor: role.color,
        userId: newUserId,
      },
    ]);
    setNewRoleId('');
    setNewUserId('');
  };

  const handleDeleteProjectRoleRow = (rowId: string) => {
    setProjectRoleAssignments((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleSaveProjectRoles = async () => {
    setIsSavingProjectRoles(true);
    try {
      const updatedSettings: BoardSettings = {
        ...board.settings,
        projectRoleAssignments,
      };

      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      const data = await response.json();
      if (data.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to save project role assignments:', err);
    } finally {
      setIsSavingProjectRoles(false);
    }
  };

  const projectRolesChanged = JSON.stringify(projectRoleAssignments) !== JSON.stringify(board.settings.projectRoleAssignments || []);

  // Check if dates changed
  const datesChanged =
    startDate !== (board.settings.projectStartDate || '') ||
    lastTweak !== (board.settings.lastDayAnimationTweaks || '') ||
    releaseDate !== (board.settings.releaseDate || '');

  return (
    <main className="p-6 flex-1 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">{board.name}</h1>
        <Link href={`/boards/${board.id}`}>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Board
          </Button>
        </Link>
      </div>

      <div className="space-y-8">
        {/* Team Section */}
        <section>
          <h2 className="text-title font-medium text-text-secondary mb-3">Team</h2>
          {isAdmin ? (
            <Popover open={teamOpen} onOpenChange={setTeamOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={teamOpen}
                  className="w-64 justify-between"
                >
                  {selectedTeam ? (
                    <span className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: selectedTeam.color }}
                      />
                      {selectedTeam.name}
                    </span>
                  ) : (
                    <span className="text-text-tertiary">No team assigned</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search teams..." />
                  <CommandList>
                    <CommandEmpty>No teams found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => handleTeamChange(null)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            teamId === null ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="text-text-tertiary">No team</span>
                      </CommandItem>
                      {teams.map(team => (
                        <CommandItem
                          key={team.id}
                          value={team.name}
                          onSelect={() => handleTeamChange(team.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              teamId === team.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div
                            className="mr-2 w-3 h-3 rounded-sm"
                            style={{ backgroundColor: team.color }}
                          />
                          {team.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : selectedTeam ? (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: selectedTeam.color }}
              />
              <span className="text-body text-text-primary">{selectedTeam.name}</span>
            </div>
          ) : (
            <span className="text-body text-text-tertiary">No team assigned</span>
          )}
        </section>

        {/* Members Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-text-secondary" />
            <h2 className="text-title font-medium text-text-secondary">
              Members ({members.length})
            </h2>
          </div>

          {/* Add member (admin only) */}
          {isAdmin && (
            <div className="mb-4">
              <Popover open={usersOpen} onOpenChange={setUsersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="text-text-tertiary">Add member...</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users available.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map(user => (
                          <CommandItem
                            key={user.id}
                            value={user.name || user.email}
                            onSelect={() => handleAddMember(user.email)}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="text-tiny">
                                {(user.name || user.email)[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.name || 'Unnamed'}</span>
                              <span className="text-tiny text-text-tertiary">
                                {user.email}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Members list */}
          <div className="rounded-lg border border-border overflow-hidden">
            {members.length === 0 ? (
              <div className="p-4 text-center text-text-tertiary">No members</div>
            ) : (
              <div className="divide-y divide-border">
                {members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.user.image || undefined} />
                        <AvatarFallback className="text-body">
                          {(member.user.name || member.user.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-text-primary">
                          {member.user.name || member.user.email}
                        </div>
                        {/* Role badges */}
                        {member.user.userCompanyRoles &&
                          member.user.userCompanyRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {member.user.userCompanyRoles.map(({ companyRole }) => (
                                <span
                                  key={companyRole.id}
                                  className="px-2 py-0.5 rounded-full text-tiny font-medium"
                                  style={{
                                    backgroundColor: `${companyRole.color || '#71717a'}20`,
                                    color: companyRole.color || '#71717a',
                                  }}
                                >
                                  {companyRole.name}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-tiny text-text-tertiary">
                        {member.permission.toLowerCase()}
                      </span>
                      {isAdmin && member.permission !== 'ADMIN' && member.permission !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1.5 rounded-md text-text-tertiary hover:text-red-500 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Important Dates Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-text-secondary" />
            <h2 className="text-title font-medium text-text-secondary">Important Dates</h2>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-caption font-medium text-text-secondary">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-body text-text-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-caption font-medium text-text-secondary">
                  Last Tweak
                </label>
                <input
                  type="date"
                  value={lastTweak}
                  onChange={e => setLastTweak(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-body text-text-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-caption font-medium text-text-secondary">
                  Release Date
                </label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={e => setReleaseDate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-body text-text-primary disabled:opacity-50"
                />
              </div>
            </div>

            {isAdmin && datesChanged && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveDates}
                  disabled={isSavingDates}
                  size="sm"
                >
                  {isSavingDates ? 'Saving...' : 'Save Dates'}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Project Role Rows Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-text-secondary" />
            <h2 className="text-title font-medium text-text-secondary">Project Roles</h2>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            {isAdmin && (
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body"
                >
                  <option value="">Select role...</option>
                  {companyRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body"
                >
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name || member.user.email}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddProjectRoleRow}
                  disabled={!newRoleId || !newUserId}
                >
                  Add Row
                </Button>
              </div>
            )}

            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Role</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Name</th>
                    {isAdmin ? (
                      <th className="px-3 py-2 text-right font-medium text-text-secondary">Action</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectRoleAssignments.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-text-tertiary" colSpan={isAdmin ? 3 : 2}>
                        No project role rows configured yet.
                      </td>
                    </tr>
                  ) : (
                    projectRoleAssignments.map((row) => {
                      const member = membersById[row.userId];
                      return (
                        <tr key={row.id} className="bg-surface">
                          <td className="px-3 py-2">
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-tiny font-medium"
                              style={{
                                backgroundColor: `${row.roleColor || '#71717a'}22`,
                                color: row.roleColor || '#71717a',
                              }}
                            >
                              {row.roleName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-text-primary">
                            {member ? (member.name || member.email) : 'Removed member'}
                          </td>
                          {isAdmin ? (
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProjectRoleRow(row.id)}
                              >
                                Remove
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {isAdmin && projectRolesChanged && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProjectRoles}
                  disabled={isSavingProjectRoles}
                  size="sm"
                >
                  {isSavingProjectRoles ? 'Saving...' : 'Save Project Roles'}
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
