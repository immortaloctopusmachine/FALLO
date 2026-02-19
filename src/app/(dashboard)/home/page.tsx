import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HomePageClient } from '@/components/home/HomePageClient';

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <HomePageClient />;
}
