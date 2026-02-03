import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { TeamCard } from '@/components/organization/TeamCard';
import { CreateTeamDialog } from '@/components/organization/CreateTeamDialog';

export default async function TeamsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const teams = await prisma.team.findMany({
    where: {
      archivedAt: null,
    },
    orderBy: [{ studioId: 'asc' }, { position: 'asc' }],
    include: {
      studio: {
        select: { id: true, name: true, color: true },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
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

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permission: true },
  });
  const isAdmin = user?.permission === 'ADMIN' || user?.permission === 'SUPER_ADMIN';

  // Group teams by studio
  const teamsWithStudio = teams.filter((t) => t.studio);
  const teamsWithoutStudio = teams.filter((t) => !t.studio);

  // Group by studio
  const teamsByStudio = teamsWithStudio.reduce(
    (acc, team) => {
      const studioId = team.studio!.id;
      if (!acc[studioId]) {
        acc[studioId] = {
          studio: team.studio!,
          teams: [],
        };
      }
      acc[studioId].teams.push(team);
      return acc;
    },
    {} as Record<string, { studio: { id: string; name: string; color: string | null }; teams: typeof teams }>
  );

  return (
    <main className="p-6 flex-1">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-title font-medium text-text-secondary">
              All Teams ({teams.length})
            </h2>
            <p className="text-caption text-text-tertiary mt-1">
              Teams group members together and can own boards.
            </p>
          </div>
          {isAdmin && <CreateTeamDialog />}
        </div>

        {teams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-title text-text-secondary">No teams yet</h3>
            <p className="mt-2 text-body text-text-tertiary">
              {isAdmin
                ? 'Create your first team to start collaborating.'
                : 'No teams have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Teams grouped by studio */}
            {Object.values(teamsByStudio).map(({ studio, teams: studioTeams }) => (
              <div key={studio.id}>
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: studio.color || '#6366f1' }}
                  />
                  <Link
                    href={`/studios/${studio.id}`}
                    className="text-body font-medium text-text-secondary hover:text-text-primary"
                  >
                    {studio.name}
                  </Link>
                  <span className="text-caption text-text-tertiary">
                    ({studioTeams.length} teams)
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {studioTeams.map((team) => (
                    <TeamCard
                      key={team.id}
                      id={team.id}
                      name={team.name}
                      description={team.description}
                      image={team.image}
                      color={team.color}
                      memberCount={team._count.members}
                      boardCount={team._count.boards}
                      members={team.members}
                      showDelete={isAdmin}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Independent teams (no studio) */}
            {teamsWithoutStudio.length > 0 && (
              <div>
                <div className="mb-4">
                  <span className="text-body font-medium text-text-secondary">
                    Independent Teams
                  </span>
                  <span className="text-caption text-text-tertiary ml-2">
                    ({teamsWithoutStudio.length} teams)
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {teamsWithoutStudio.map((team) => (
                    <TeamCard
                      key={team.id}
                      id={team.id}
                      name={team.name}
                      description={team.description}
                      image={team.image}
                      color={team.color}
                      memberCount={team._count.members}
                      boardCount={team._count.boards}
                      members={team.members}
                      showDelete={isAdmin}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </main>
  );
}
