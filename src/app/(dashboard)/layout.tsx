import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { GlobalNav } from '@/components/shared/GlobalNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col skin-bg">
      <GlobalNav
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
