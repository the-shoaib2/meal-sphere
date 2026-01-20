import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchGroupDetails, fetchGroupAccessData } from '@/lib/services/groups-service';
import { GroupPageContent } from '@/components/groups/group-page-content';
import { NoGroupState } from "@/components/empty-states/no-group-state";

export const dynamic = 'force-dynamic';

export default async function GroupPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const groupId = params.id;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch group details and access data in parallel
  const [groupData, accessData] = await Promise.all([
    fetchGroupDetails(groupId, session.user.id),
    fetchGroupAccessData(groupId, session.user.id)
  ]);

  const { group } = groupData;

  if (!group || !accessData.canAccess) {
    if (accessData.error === "Not a member of this private group") {
      redirect(`/groups/join/${groupId}`);
    }

    return (
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Group Not Found</h1>
          <p className="text-muted-foreground text-sm">
            The group you are looking for does not exist or you do not have permission to view it.
          </p>
        </div>
        <NoGroupState />
      </div>
    );
  }

  return (
    <GroupPageContent
      groupId={groupId}
      initialData={group}
      initialAccessData={accessData}
    />
  );
}
