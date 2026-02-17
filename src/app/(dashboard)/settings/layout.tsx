import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SettingsSidebarNav } from '@/components/settings/SettingsSidebarNav';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permission: true },
  });

  const isSuperAdmin = user?.permission === 'SUPER_ADMIN';
  const isAdmin = user?.permission === 'ADMIN' || isSuperAdmin;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/boards"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-body">Back to Boards</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-heading font-semibold">Settings</h1>
        </div>
      </header>

      <div className="flex">
        <SettingsSidebarNav isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
