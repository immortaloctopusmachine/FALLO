import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UsersPageClient } from '@/components/users/UsersPageClient';

export default async function UsersPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Get current user's permission
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user?.id },
    select: { permission: true },
  });

  const isSuperAdmin = currentUser?.permission === 'SUPER_ADMIN';

  // Fetch all data in parallel
  const [users, teams, skills, companyRoles] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null }, // Exclude soft-deleted users
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        permission: true,
        teamMembers: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        userSkills: {
          include: {
            skill: true,
          },
        },
        userCompanyRoles: {
          include: {
            companyRole: true,
          },
        },
        _count: {
          select: {
            assignedCards: true,
            boardMembers: true,
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

  return (
    <UsersPageClient
      users={users}
      teams={teams}
      skills={skills}
      companyRoles={companyRoles}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
