'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Building2, Users, User, ChevronRight, Layers } from 'lucide-react';
import { useOrganizationData } from '@/hooks/api/use-organization';
import { OrganizationSkeleton } from '@/components/organization/OrganizationSkeleton';

export function OrganizationPageClient() {
  const { data, isLoading } = useOrganizationData();

  if (isLoading || !data) return <OrganizationSkeleton />;

  const { studios, teams, users } = data;

  // Calculate stats
  const totalTeams = teams.length;
  const totalUsers = users.length;
  const teamsWithoutStudio = teams.filter((t) => !t.studio).length;
  const usersWithoutTeams = users.filter((u) => u._count.teamMembers === 0).length;

  return (
    <main className="p-6 flex-1">
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link
          href="/studios"
          className="rounded-lg border border-border bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card-epic/10 text-card-epic">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">{studios.length}</div>
                <div className="text-caption text-text-secondary">Studios</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-tertiary" />
          </div>
        </Link>

        <Link
          href="/teams"
          className="rounded-lg border border-border bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card-user-story/10 text-card-user-story">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">{totalTeams}</div>
                <div className="text-caption text-text-secondary">Teams</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-tertiary" />
          </div>
        </Link>

        <Link
          href="/users"
          className="rounded-lg border border-border bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card-task/10 text-card-task">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">{totalUsers}</div>
                <div className="text-caption text-text-secondary">Users</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-tertiary" />
          </div>
        </Link>

        <Link
          href="/boards"
          className="rounded-lg border border-border bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">
                  {teams.reduce((acc, t) => acc + t._count.boards, 0)}
                </div>
                <div className="text-caption text-text-secondary">Boards</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-tertiary" />
          </div>
        </Link>
      </div>

      {/* Organization Hierarchy */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Studios with Teams */}
        <div>
          <h2 className="text-title font-medium text-text-secondary mb-4">
            Studios & Teams
          </h2>
          <div className="space-y-4">
            {studios.map((studio) => {
              const studioTeams = teams.filter((t) => t.studio?.id === studio.id);
              return (
                <div
                  key={studio.id}
                  className="rounded-lg border border-border bg-surface overflow-hidden"
                >
                  <Link
                    href={`/studios/${studio.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-surface-hover transition-colors"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: studio.color ? `${studio.color}20` : 'rgba(99, 102, 241, 0.1)',
                        color: studio.color || '#6366f1',
                      }}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary">{studio.name}</div>
                      <div className="text-caption text-text-tertiary">
                        {studio._count.teams} teams
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary" />
                  </Link>
                  {studioTeams.length > 0 && (
                    <div className="border-t border-border divide-y divide-border">
                      {studioTeams.map((team) => (
                        <Link
                          key={team.id}
                          href={`/teams/${team.id}`}
                          className="flex items-center gap-3 px-4 py-3 pl-12 hover:bg-surface-hover transition-colors"
                        >
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="text-body text-text-primary">{team.name}</span>
                          <span className="text-caption text-text-tertiary ml-auto">
                            {team._count.members} members
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Independent Teams */}
            {teamsWithoutStudio > 0 && (
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-border">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-hover text-text-secondary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">Independent Teams</div>
                    <div className="text-caption text-text-tertiary">
                      {teamsWithoutStudio} teams without studio
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {teams
                    .filter((t) => !t.studio)
                    .map((team) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="text-body text-text-primary">{team.name}</span>
                        <span className="text-caption text-text-tertiary ml-auto">
                          {team._count.members} members
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {studios.length === 0 && teamsWithoutStudio === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Building2 className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-body text-text-secondary">No studios or teams yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Users Overview */}
        <div>
          <h2 className="text-title font-medium text-text-secondary mb-4">
            Recent Users
          </h2>
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="divide-y divide-border">
              {users.slice(0, 10).map((user) => (
                <Link
                  key={user.id}
                  href={`/users/${user.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="relative h-9 w-9 rounded-full bg-surface-hover overflow-hidden">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || user.email}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-body font-medium text-text-secondary">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary truncate">
                      {user.name || user.email}
                    </div>
                    <div className="text-caption text-text-tertiary">
                      {user._count.teamMembers > 0
                        ? `${user._count.teamMembers} teams`
                        : 'No teams'}
                    </div>
                  </div>
                  <span className="text-tiny text-text-tertiary capitalize px-2 py-0.5 rounded bg-surface-hover">
                    {user.permission.toLowerCase().replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
            {users.length > 10 && (
              <Link
                href="/users"
                className="block text-center py-3 text-body text-card-epic hover:bg-surface-hover transition-colors border-t border-border"
              >
                View all {users.length} users
              </Link>
            )}
          </div>

          {usersWithoutTeams > 0 && (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="text-body text-warning font-medium">
                {usersWithoutTeams} users without teams
              </div>
              <p className="text-caption text-text-secondary mt-1">
                These users haven&apos;t been assigned to any teams yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
