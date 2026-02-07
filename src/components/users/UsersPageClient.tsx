'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Layers, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { useUsersPageData } from '@/hooks/api/use-users';
import { UsersSkeleton } from '@/components/users/UsersSkeleton';

interface UsersPageUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  permission: string;
  teamMembers: {
    team: {
      id: string;
      name: string;
      color: string;
    };
  }[];
  userSkills: {
    skill: {
      id: string;
      name: string;
      color: string | null;
    };
  }[];
  userCompanyRoles: {
    companyRole: {
      id: string;
      name: string;
      color: string | null;
    };
  }[];
  _count: {
    assignedCards: number;
    boardMembers: number;
  };
}

interface UsersPageClientProps {
  isSuperAdmin: boolean;
}

export function UsersPageClient({ isSuperAdmin }: UsersPageClientProps) {
  const { data, isLoading } = useUsersPageData();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UsersPageUser | null>(null);

  if (isLoading || !data) return <UsersSkeleton />;

  const { users, teams, skills, companyRoles } = data;

  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-title font-medium text-text-secondary">
            All Users ({users.length})
          </h2>
          <p className="text-caption text-text-tertiary mt-1">
            View all users in the system, their teams, and skills.
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-hover">
            <tr>
              <th className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                User
              </th>
              <th className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                Permission
              </th>
              <th className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                Teams
              </th>
              <th className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                Roles
              </th>
              <th className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                Skills
              </th>
              <th className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                Activity
              </th>
              {isSuperAdmin && (
                <th className="text-left text-caption font-medium text-text-secondary px-4 py-3 w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="bg-surface hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/users/${user.id}`} className="flex items-center gap-3">
                    <div className="relative h-9 w-9 rounded-full bg-surface-hover overflow-hidden">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || user.email}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-body font-medium text-text-secondary">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary hover:text-card-epic">
                        {user.name || 'Unnamed'}
                      </div>
                      <div className="text-caption text-text-tertiary">{user.email}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-body text-text-secondary capitalize">
                    {user.permission.toLowerCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {user.teamMembers.slice(0, 3).map(({ team }) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-tiny font-medium hover:opacity-80"
                        style={{
                          backgroundColor: `${team.color}20`,
                          color: team.color,
                        }}
                      >
                        {team.name}
                      </Link>
                    ))}
                    {user.teamMembers.length > 3 && (
                      <span className="text-tiny text-text-tertiary">
                        +{user.teamMembers.length - 3}
                      </span>
                    )}
                    {user.teamMembers.length === 0 && (
                      <span className="text-caption text-text-tertiary">No teams</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {(user.userCompanyRoles || []).slice(0, 4).map(({ companyRole }) => (
                      <div
                        key={companyRole.id}
                        className="px-2 py-0.5 rounded text-tiny font-medium"
                        style={{
                          backgroundColor: `${companyRole.color || '#71717a'}20`,
                          color: companyRole.color || '#71717a',
                        }}
                        title={companyRole.name}
                      >
                        {companyRole.name}
                      </div>
                    ))}
                    {(user.userCompanyRoles || []).length > 4 && (
                      <span className="text-tiny text-text-tertiary">
                        +{(user.userCompanyRoles || []).length - 4}
                      </span>
                    )}
                    {(user.userCompanyRoles || []).length === 0 && (
                      <span className="text-caption text-text-tertiary">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {user.userSkills.slice(0, 4).map(({ skill }) => (
                      <div
                        key={skill.id}
                        className="h-5 w-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: skill.color || '#71717a' }}
                        title={skill.name}
                      >
                        <span className="text-tiny text-white font-medium">
                          {skill.name.charAt(0)}
                        </span>
                      </div>
                    ))}
                    {user.userSkills.length > 4 && (
                      <span className="text-tiny text-text-tertiary">
                        +{user.userSkills.length - 4}
                      </span>
                    )}
                    {user.userSkills.length === 0 && (
                      <span className="text-caption text-text-tertiary">No skills</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-caption text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {user._count.boardMembers} boards
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {user._count.assignedCards} tasks
                    </span>
                  </div>
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                      title="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        teams={teams}
        skills={skills}
        companyRoles={companyRoles}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        teams={teams}
        skills={skills}
        companyRoles={companyRoles}
      />
    </main>
  );
}
