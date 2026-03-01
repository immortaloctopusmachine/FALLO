import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { DailyLoginRecorder } from '@/components/shared/DailyLoginRecorder';
import { BadgeAwardOverlay } from '@/components/rewards/BadgeAwardOverlay';

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
    <div className="h-screen flex flex-col skin-bg overflow-hidden">
      <DailyLoginRecorder />
      <BadgeAwardOverlay />
      <GlobalNav
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
