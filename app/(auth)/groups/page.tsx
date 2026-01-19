import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchGroupsData } from '@/lib/services/groups-service';
import { GroupsView } from '@/components/groups/groups-view';

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground text-sm">
            Join existing groups or create your own to start planning meals together.
          </p>
        </div>
      </div>

      <GroupsView initialData={data} />
    </div>
  );
}
