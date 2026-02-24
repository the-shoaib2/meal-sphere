import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchGroupsData } from '@/lib/services/groups-service';
import { GroupsView } from '@/components/groups/groups-view';
import { PageHeader } from '@/components/shared/page-header';


export default async function GroupsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const initialTab = searchParams.tab || 'my-groups';
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Server-side data fetching with caching and encryption
  const data = await fetchGroupsData(session.user.id);

  return (
    <div className="space-y-2">
      <PageHeader
        heading="Groups"
        description="Join or create groups to plan meals together."
      />

      <GroupsView 
      initialData={data} 
      initialTab={initialTab} 
      />
      
    </div>
  );
}
