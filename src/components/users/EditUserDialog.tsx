'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Team, User as BaseUser } from '@/types';

interface Skill {
  id: string;
  name: string;
  color: string | null;
}

interface CompanyRole {
  id: string;
  name: string;
  color: string | null;
}

interface UserToEdit {
  id: BaseUser['id'];
  name: BaseUser['name'];
  email: BaseUser['email'];
  permission: string;
  teamMembers: {
    team: Team;
  }[];
  userSkills: {
    skill: {
      id: string;
      name: string;
      color: string | null;
    };
  }[];
  userCompanyRoles?: {
    companyRole: {
      id: string;
      name: string;
      color: string | null;
    };
  }[];
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserToEdit | null;
  teams: Team[];
  skills: Skill[];
  companyRoles: CompanyRole[];
}

const PERMISSIONS = [
  { value: 'VIEWER', label: 'Viewer', description: 'Can view boards and cards' },
  { value: 'MEMBER', label: 'Member', description: 'Can create and edit cards' },
  { value: 'ADMIN', label: 'Admin', description: 'Can manage boards and users' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full system access' },
] as const;

export function EditUserDialog({
  isOpen,
  onClose,
  user,
  teams,
  skills,
  companyRoles,
}: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [permission, setPermission] = useState<string>('MEMBER');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedCompanyRoleIds, setSelectedCompanyRoleIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPermission(user.permission);
      setSelectedTeamIds(user.teamMembers.map(tm => tm.team.id));
      setSelectedSkillIds(user.userSkills.map(us => us.skill.id));
      setSelectedCompanyRoleIds(user.userCompanyRoles?.map(ucr => ucr.companyRole.id) || []);
      setError(null);
    }
  }, [user]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const toggleCompanyRole = (roleId: string) => {
    setSelectedCompanyRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          permission,
          teamIds: selectedTeamIds,
          skillIds: selectedSkillIds,
          companyRoleIds: selectedCompanyRoleIds,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to update user');
        return;
      }

      const affectedTeamIds = new Set<string>([
        ...user.teamMembers.map((tm) => tm.team.id),
        ...selectedTeamIds,
      ]);
      onClose();
      queryClient.invalidateQueries({ queryKey: ['users', 'page'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', user.id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      affectedTeamIds.forEach((teamId) => {
        queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
      });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to delete user');
        setShowDeleteConfirm(false);
        return;
      }

      const affectedTeamIds = new Set<string>([
        ...user.teamMembers.map((tm) => tm.team.id),
        ...selectedTeamIds,
      ]);
      onClose();
      queryClient.invalidateQueries({ queryKey: ['users', 'page'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', user.id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      affectedTeamIds.forEach((teamId) => {
        queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
      });
    } catch {
      setError('An error occurred. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details for {user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="p-2 rounded-md border border-border bg-surface-subtle text-text-secondary">
              {user.email}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {/* Permission Level */}
          <div className="space-y-2">
            <Label>Permission Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setPermission(r.value)}
                  className={cn(
                    'flex flex-col items-start p-2 rounded-md border-2 text-left transition-colors',
                    permission === r.value
                      ? 'border-success bg-success/10'
                      : 'border-border hover:border-success/50'
                  )}
                >
                  <span className={cn(
                    'text-body font-medium',
                    permission === r.value && 'text-success'
                  )}>
                    {r.label}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {r.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Teams</Label>
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeam(team.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-body transition-colors',
                        isSelected
                          ? 'ring-2 ring-success'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${team.color}20`,
                        color: team.color,
                      }}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>
              {teams.length === 0 && (
                <p className="text-caption text-text-tertiary">No teams available</p>
              )}
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  const color = skill.color || '#71717a';
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-body transition-colors',
                        isSelected
                          ? 'ring-2 ring-success'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {skill.name}
                    </button>
                  );
                })}
              </div>
              {skills.length === 0 && (
                <p className="text-caption text-text-tertiary">No skills available</p>
              )}
            </div>
          )}

          {/* Company Roles */}
          {companyRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {companyRoles.map((companyRole) => {
                  const isSelected = selectedCompanyRoleIds.includes(companyRole.id);
                  const color = companyRole.color || '#71717a';
                  return (
                    <button
                      key={companyRole.id}
                      type="button"
                      onClick={() => toggleCompanyRole(companyRole.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-body transition-colors',
                        isSelected
                          ? 'ring-2 ring-success'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {companyRole.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-caption text-error">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-error hover:text-error hover:bg-error/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete User
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  'Saving...'
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{user.name || user.email}</strong>?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove them from all teams</li>
                <li>Prevent them from logging in</li>
              </ul>
              <br />
              Their data on boards (assignments, comments, activities) will be preserved but they will appear as a deleted user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-error hover:bg-error/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
