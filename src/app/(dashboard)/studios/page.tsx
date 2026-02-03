import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StudioCard } from '@/components/organization/StudioCard';
import { CreateStudioDialog } from '@/components/organization/CreateStudioDialog';

export default async function StudiosPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const studios = await prisma.studio.findMany({
    where: {
      archivedAt: null,
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          teams: { where: { archivedAt: null } },
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

  return (
    <main className="p-6 flex-1">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-title font-medium text-text-secondary">
              All Studios ({studios.length})
            </h2>
            <p className="text-caption text-text-tertiary mt-1">
              Studios group teams together and provide shared settings.
            </p>
          </div>
          {isAdmin && <CreateStudioDialog />}
        </div>

        {studios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-title text-text-secondary">No studios yet</h3>
            <p className="mt-2 text-body text-text-tertiary">
              {isAdmin
                ? 'Create your first studio to start organizing teams.'
                : 'No studios have been created yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {studios.map((studio) => (
              <StudioCard
                key={studio.id}
                id={studio.id}
                name={studio.name}
                description={studio.description}
                image={studio.image}
                color={studio.color}
                teamCount={studio._count.teams}
              />
            ))}
          </div>
        )}
    </main>
  );
}
