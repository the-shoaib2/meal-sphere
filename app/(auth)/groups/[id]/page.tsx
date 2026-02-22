import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchGroupDetails, fetchGroupRequests, fetchGroupInviteTokens } from '@/lib/services/groups-service';
import { validateGroupAccess } from '@/lib/auth/group-auth';
import { getVotes } from '@/lib/services/voting-service';
import { GroupPageContent } from '@/components/groups/group-page-content';
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { PageHeader } from '@/components/shared/page-header';

export const dynamic = 'force-dynamic';

export default async function GroupPage(props: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const groupId = params.id;
  const tab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined;

  // 1. Initial Access & Data Fetching (Optimized Parallelization)
  // We fetch everything in parallel. Security checks are performed AFTER data is retrieved
  // to avoid waterfalls. fetchGroupDetails already includes membership info.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;

  const [groupData, votes, joinRequestsRaw, inviteTokensResult] = await Promise.all([
    fetchGroupDetails(groupId, userId),
    getVotes(groupId),
    // We fetch these regardless, access is checked before passing to client
    fetchGroupRequests(groupId),
    fetchGroupInviteTokens(groupId, userId)
  ]);

  const { group, userMembership } = groupData || { group: null, userMembership: null };

  // 2. Security & Redirection Logic
  if (!group) {
    return (
      <div className="space-y-2 p-4">
        <NoGroupState />
      </div>
    );
  }

  const isMember = !!userMembership && !userMembership.isBanned;
  const isAdmin = userMembership?.role === 'ADMIN' || userMembership?.role === 'MANAGER';
  const isCreator = group.createdById === userId;

  if (group.isPrivate && !isMember) {
    redirect(`/groups/join/${groupId}`);
  }

  // Determine userRole for GroupPageContent
  const userRole = userMembership?.role || null;

  // Reconstruct authResult for GroupPageContent compatibility
  const authResult = {
    isAuthenticated: true,
    isMember,
    userRole,
    canAccess: isMember || !group.isPrivate,
    isAdmin,
    isCreator,
    groupId,
    userId,
    features: group.features as Record<string, boolean>
  };

  const inviteTokens = inviteTokensResult.data || [];
  const joinRequests = isAdmin ? joinRequestsRaw : [];

  return (
    <GroupPageContent
      groupId={groupId}
      initialData={group}
      initialAccessData={authResult}
      joinRequests={joinRequests}
      initialVotes={votes}
      initialInviteTokens={inviteTokens}
      initialTab={tab}
    />
  );
}
