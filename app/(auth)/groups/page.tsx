import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchGroupsData } from '@/lib/services/groups-service';
import { GroupsView } from '@/components/groups/groups-view';
import { PageHeader } from '@/components/shared/page-header';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Server-side data fetching with caching and encryption
  const data = await fetchGroupsData(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Groups"
        text="Join or create groups to plan meals together."
      />

      <GroupsView initialData={data} />
    </div>
  );
}
