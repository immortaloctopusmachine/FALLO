'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Calendar, Users, Layers, Sparkles, Pencil, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamCard } from '@/components/organization/TeamCard';
import { EditUserDialog } from './EditUserDialog';

interface Skill {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string;
  studio: { id: string; name: string } | null;
  members: {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }[];
  _count: {
    boards: number;
    members: number;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  permission: string;
  createdAt: Date;
  teamMembers: {
    team: Team;
    title: string | null;
    permission: string;
  }[];
  userSkills: {
    skill: Skill;
  }[];
  userCompanyRoles?: {
    companyRole: {
      id: string;
      name: string;
      color: string | null;
      description: string | null;
    };
  }[];
  boardMembers: {
    board: {
      id: string;
      name: string;
      archivedAt: Date | null;
      isTemplate: boolean;
    };
    permission: string;
  }[];
  _count: {
    assignedCards: number;
    comments: number;
  };
}

interface AllTeam {
  id: string;
  name: string;
  color: string;
}

interface AllSkill {
  id: string;
  name: string;
  color: string | null;
}

interface AllCompanyRole {
  id: string;
  name: string;
  color: string | null;
}

interface UserDetailClientProps {
  user: User;
  isSuperAdmin: boolean;
  allTeams: AllTeam[];
  allSkills: AllSkill[];
  allCompanyRoles: AllCompanyRole[];
}

export function UserDetailClient({
  user,
  isSuperAdmin,
  allTeams,
  allSkills,
  allCompanyRoles,
}: UserDetailClientProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  const activeBoards = user.boardMembers.filter(
    (m) => !m.board.archivedAt && !m.board.isTemplate
  );

  // Convert user to edit format
  const userToEdit = {
    id: user.id,
    name: user.name,
    email: user.email,
    permission: user.permission,
    teamMembers: user.teamMembers.map(tm => ({
      team: {
        id: tm.team.id,
        name: tm.team.name,
        color: tm.team.color,
      },
    })),
    userSkills: user.userSkills.map(us => ({
      skill: {
        id: us.skill.id,
        name: us.skill.name,
        color: us.skill.color,
      },
    })),
    userCompanyRoles: (user.userCompanyRoles || []).map(ucr => ({
      companyRole: {
        id: ucr.companyRole.id,
        name: ucr.companyRole.name,
        color: ucr.companyRole.color,
      },
    })),
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Profile Header */}
      <div className="border-b border-border bg-surface px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 rounded-full bg-surface-hover overflow-hidden">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || user.email}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-text-secondary">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-heading font-semibold">{user.name || 'Unnamed User'}</h1>
              <div className="flex items-center gap-2 mt-1 text-body text-text-secondary">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-4 mt-2 text-caption text-text-tertiary">
                <span className="capitalize px-2 py-0.5 rounded bg-surface-hover">
                  {user.permission.toLowerCase().replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/users/${user.id}/time`}>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-1" />
                Time Stats
              </Button>
            </Link>
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit User
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 flex items-center gap-6 text-body">
          <div>
            <span className="font-semibold text-text-primary">{user.teamMembers.length}</span>
            <span className="text-text-secondary ml-1">teams</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{activeBoards.length}</span>
            <span className="text-text-secondary ml-1">boards</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{user._count.assignedCards}</span>
            <span className="text-text-secondary ml-1">assigned tasks</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{user._count.comments}</span>
            <span className="text-text-secondary ml-1">comments</span>
          </div>
        </div>
      </div>

      <main className="p-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Roles & Skills Section */}
          <div className="lg:col-span-1">
            {/* Company Roles */}
            {(user.userCompanyRoles || []).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-text-secondary" />
                  <h2 className="text-title font-medium text-text-secondary">
                    Roles ({(user.userCompanyRoles || []).length})
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(user.userCompanyRoles || []).map(({ companyRole }) => (
                    <div
                      key={companyRole.id}
                      className="px-3 py-1.5 rounded-full text-body font-medium"
                      style={{
                        backgroundColor: `${companyRole.color || '#71717a'}20`,
                        color: companyRole.color || '#71717a',
                      }}
                    >
                      {companyRole.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-text-secondary" />
              <h2 className="text-title font-medium text-text-secondary">
                Skills ({user.userSkills.length})
              </h2>
            </div>
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              {user.userSkills.length === 0 ? (
                <div className="p-4 text-center text-text-tertiary">No skills assigned</div>
              ) : (
                <div className="divide-y divide-border">
                  {user.userSkills.map(({ skill }) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: skill.color || '#71717a' }}
                      >
                        <span className="text-body font-medium text-white">
                          {skill.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{skill.name}</div>
                        {skill.description && (
                          <div className="text-caption text-text-tertiary truncate max-w-[200px]">
                            {skill.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Boards */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-text-secondary" />
                <h2 className="text-title font-medium text-text-secondary">
                  Active Boards ({activeBoards.length})
                </h2>
              </div>
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                {activeBoards.length === 0 ? (
                  <div className="p-4 text-center text-text-tertiary">No active boards</div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeBoards.slice(0, 5).map(({ board, permission }) => (
                      <Link
                        key={board.id}
                        href={`/boards/${board.id}`}
                        className="flex items-center justify-between p-3 hover:bg-surface-hover transition-colors"
                      >
                        <span className="font-medium text-text-primary hover:text-card-epic">
                          {board.name}
                        </span>
                        <span className="text-caption text-text-tertiary capitalize">
                          {permission.toLowerCase()}
                        </span>
                      </Link>
                    ))}
                    {activeBoards.length > 5 && (
                      <div className="p-3 text-center text-caption text-text-tertiary">
                        +{activeBoards.length - 5} more boards
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Teams Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-text-secondary" />
              <h2 className="text-title font-medium text-text-secondary">
                Teams ({user.teamMembers.length})
              </h2>
            </div>
            {user.teamMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Users className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                <h3 className="text-title text-text-secondary">Not in any teams</h3>
                <p className="mt-2 text-body text-text-tertiary">
                  This user hasn&apos;t been added to any teams yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {user.teamMembers.map(({ team, title }) => (
                  <div key={team.id} className="relative">
                    <TeamCard
                      id={team.id}
                      name={team.name}
                      description={team.description}
                      image={team.image}
                      color={team.color}
                      memberCount={team._count.members}
                      boardCount={team._count.boards}
                      members={team.members}
                    />
                    {title && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-tiny font-medium bg-surface/90 text-text-secondary">
                        {title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit User Dialog */}
      <EditUserDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        user={userToEdit}
        teams={allTeams}
        skills={allSkills}
        companyRoles={allCompanyRoles}
      />
    </div>
  );
}
