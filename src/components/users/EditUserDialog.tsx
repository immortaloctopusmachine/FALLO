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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Team, User as BaseUser } from '@/types';
import {
  type UserCompanyRoleOption,
  UserDialogShell,
  UserMetadataFormBlock,
  UserFormSubmitActions,
  type UserSkillOption,
} from './UserFormSections';
import { invalidateUserAndTeamQueries } from './user-query-invalidation';

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
  skills: UserSkillOption[];
  companyRoles: UserCompanyRoleOption[];
}

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

  const finalizeUserMutationSuccess = () => {
    if (!user) return;

    const affectedTeamIds = new Set<string>([
      ...user.teamMembers.map((tm) => tm.team.id),
      ...selectedTeamIds,
    ]);
    onClose();
    invalidateUserAndTeamQueries(queryClient, {
      userId: user.id,
      teamIds: affectedTeamIds,
    });
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

      finalizeUserMutationSuccess();
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

      finalizeUserMutationSuccess();
    } catch {
      setError('An error occurred. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  const metadataSelectionState = {
    selectedTeamIds,
    setSelectedTeamIds,
    selectedSkillIds,
    setSelectedSkillIds,
    selectedRoleIds: selectedCompanyRoleIds,
    setSelectedRoleIds: setSelectedCompanyRoleIds,
  };
  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name, color: team.color }));

  return (
    <>
      <UserDialogShell
        isOpen={isOpen}
        onClose={onClose}
        title="Edit User"
        description={(
          <>
            Update user details for {user.email}
          </>
        )}
        onSubmit={handleSubmit}
      >
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

        <UserMetadataFormBlock
          permission={permission}
          onPermissionChange={setPermission}
          teams={teamOptions}
          skills={skills}
          roles={companyRoles}
          selectionState={metadataSelectionState}
          error={error}
        />

        <UserFormSubmitActions
          onCancel={onClose}
          isLoading={isLoading}
          loadingLabel="Saving..."
          submitLabel="Save Changes"
          submitIcon={<Pencil className="h-4 w-4 mr-1" />}
          submitDisabled={isLoading}
          leadingAction={(
            <Button
              type="button"
              variant="ghost"
              className="text-error hover:text-error hover:bg-error/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete User
            </Button>
          )}
        />
      </UserDialogShell>

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
    </>
  );
}
