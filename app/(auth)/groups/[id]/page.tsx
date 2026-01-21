import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchGroupDetails, fetchGroupAccessData, fetchGroupRequests, fetchGroupInviteTokens } from '@/lib/services/groups-service';
import { getVotes } from '@/lib/services/voting-service';
import { GroupPageContent } from '@/components/groups/group-page-content';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { PageHeader } from '@/components/shared/page-header';

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
  const isAdmin = accessData.isAdmin;

  // Fetch join requests and invite tokens if admin
  const [joinRequests, inviteTokensResult] = await Promise.all([
    isAdmin ? fetchGroupRequests(groupId) : Promise.resolve([]),
    isAdmin ? fetchGroupInviteTokens(groupId, session.user.id) : Promise.resolve({ data: [] })
  ]);

  const inviteTokens = inviteTokensResult.data || [];

  // Fetch votes for all members
  const votes = await getVotes(groupId);


  if (!group || !accessData.canAccess) {
    if (accessData.error === "Not a member of this private group") {
      redirect(`/groups/join/${groupId}`);
    }

    return (
      <div className="space-y-6 p-4">
        <div>
          <PageHeader
            heading="Group Not Found"
            text="The group you are looking for does not exist or you do not have permission to view it."
          />
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
      joinRequests={joinRequests}
      initialVotes={votes}
      initialInviteTokens={inviteTokens}
    />
  );
}
