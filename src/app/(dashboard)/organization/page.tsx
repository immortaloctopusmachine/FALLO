import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OrganizationPageClient } from '@/components/organization/OrganizationPageClient';

export default async function OrganizationPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <OrganizationPageClient />;
}
