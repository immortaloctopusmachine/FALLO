import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Users, Layers, Building2 } from 'lucide-react';
import { BoardCard } from '@/components/boards/BoardCard';
import { TeamSettingsButton } from '@/components/organization/TeamSettingsButton';

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const session = await auth();
  const { teamId } = await params;

  if (!session) {
    redirect('/login');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      studio: {
        select: { id: true, name: true, color: true },
      },
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              userSkills: {
                include: {
                  skill: true,
                },
              },
            },
          },
        },
      },
      boards: {
        where: { archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        include: {
          members: true,
          lists: {
            select: { id: true },
          },
        },
      },
      _count: {
        select: {
          boards: { where: { archivedAt: null } },
          members: true,
        },
      },
    },
  });

  if (!team || team.archivedAt) {
    notFound();
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Check if user is admin for each board
  const isAdminForBoard = (board: typeof team.boards[0]) => {
    const membership = board.members.find((m) => m.userId === session.user.id);
    return membership?.role === 'ADMIN' || membership?.role === 'SUPER_ADMIN';
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner with Team Color */}
      <div
        className="h-24"
        style={{
          backgroundImage: team.image ? `url(${team.image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: !team.image ? team.color : undefined,
        }}
      />

      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 -mt-10 shrink-0 items-center justify-center rounded-xl border-4 border-surface text-white"
              style={{ backgroundColor: team.color }}
            >
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-caption text-text-tertiary">
                {team.studio ? (
                  <>
                    <Link href="/studios" className="hover:text-text-secondary">
                      Studios
                    </Link>
                    <span>/</span>
                    <Link href={`/studios/${team.studio.id}`} className="hover:text-text-secondary">
                      {team.studio.name}
                    </Link>
                    <span>/</span>
                  </>
                ) : (
                  <>
                    <Link href="/teams" className="hover:text-text-secondary">
                      Teams
                    </Link>
                    <span>/</span>
                  </>
                )}
              </div>
              <h1 className="text-heading font-semibold">{team.name}</h1>
              {team.description && (
                <p className="mt-1 text-body text-text-secondary max-w-2xl">
                  {team.description}
                </p>
              )}
            </div>
          </div>
          {isAdmin && (
            <TeamSettingsButton
              team={{
                id: team.id,
                name: team.name,
                description: team.description,
                image: team.image,
                color: team.color,
                studio: team.studio,
                members: team.members.map((m) => ({
                  id: m.id,
                  role: m.role,
                  title: m.title,
                  user: {
                    id: m.user.id,
                    name: m.user.name,
                    email: m.user.email,
                    image: m.user.image,
                  },
                })),
              }}
            />
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-body">
          <div>
            <span className="font-semibold text-text-primary">{team._count.members}</span>
            <span className="text-text-secondary ml-1">members</span>
          </div>
          <div>
            <span className="font-semibold text-text-primary">{team._count.boards}</span>
            <span className="text-text-secondary ml-1">boards</span>
          </div>
          {team.studio && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Building2 className="h-4 w-4" />
              <Link href={`/studios/${team.studio.id}`} className="hover:text-text-primary">
                {team.studio.name}
              </Link>
            </div>
          )}
        </div>
      </div>

      <main className="p-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Members Section */}
          <div className="lg:col-span-1">
            <h2 className="text-title font-medium text-text-secondary mb-4">
              Members ({team.members.length})
            </h2>
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              {team.members.length === 0 ? (
                <div className="p-4 text-center text-text-tertiary">No members yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {team.members.map(({ user: member, role, title }) => (
                    <Link
                      key={member.id}
                      href={`/users/${member.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
                    >
                      <div className="relative h-10 w-10 rounded-full bg-surface-hover overflow-hidden">
                        {member.image ? (
                          <img
                            src={member.image}
                            alt={member.name || member.email}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-body font-medium text-text-secondary">
                            {(member.name || member.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {member.name || member.email}
                        </div>
                        <div className="text-caption text-text-tertiary">
                          {title || role.toLowerCase()}
                        </div>
                      </div>
                      {member.userSkills.length > 0 && (
                        <div className="flex gap-1">
                          {member.userSkills.slice(0, 2).map(({ skill }) => (
                            <div
                              key={skill.id}
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: skill.color || '#71717a' }}
                              title={skill.name}
                            />
                          ))}
                          {member.userSkills.length > 2 && (
                            <span className="text-tiny text-text-tertiary">
                              +{member.userSkills.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Boards Section */}
          <div className="lg:col-span-2">
            <h2 className="text-title font-medium text-text-secondary mb-4">
              Boards ({team.boards.length})
            </h2>
            {team.boards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Layers className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                <h3 className="text-title text-text-secondary">No boards yet</h3>
                <p className="mt-2 text-body text-text-tertiary">
                  Create a board and assign it to this team.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {team.boards.map((board) => (
                  <BoardCard
                    key={board.id}
                    id={board.id}
                    name={board.name}
                    description={board.description}
                    listCount={board.lists.length}
                    memberCount={board.members.length}
                    isTemplate={board.isTemplate}
                    isAdmin={isAdminForBoard(board)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
