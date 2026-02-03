import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserDetailClient } from '@/components/users/UserDetailClient';

interface UserPageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const session = await auth();
  const { userId } = await params;

  if (!session) {
    redirect('/login');
  }

  // Get current user's permission
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user?.id },
    select: { permission: true },
  });

  const isSuperAdmin = currentUser?.permission === 'SUPER_ADMIN';

  // Fetch user, teams, skills, and company roles in parallel
  const [user, allTeams, allSkills, allCompanyRoles] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMembers: {
          include: {
            team: {
              include: {
                studio: {
                  select: { id: true, name: true },
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
            },
          },
        },
        userSkills: {
          include: {
            skill: true,
          },
          orderBy: {
            skill: { position: 'asc' },
          },
        },
        userCompanyRoles: {
          include: {
            companyRole: true,
          },
          orderBy: {
            companyRole: { position: 'asc' },
          },
        },
        boardMembers: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
                archivedAt: true,
                isTemplate: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedCards: true,
            comments: true,
          },
        },
      },
    }),
    prisma.team.findMany({
      where: { archivedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
    prisma.skill.findMany({
      where: { studioId: null },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
    prisma.companyRole.findMany({
      where: { studioId: null },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <UserDetailClient
      user={user}
      isSuperAdmin={isSuperAdmin}
      allTeams={allTeams}
      allSkills={allSkills}
      allCompanyRoles={allCompanyRoles}
    />
  );
}
