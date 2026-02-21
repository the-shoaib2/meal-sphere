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

  // 1. Validate Access (Standardized)
  const { success, authResult, error, status } = await validateGroupAccess(groupId);

  if (!success || !authResult) {
    if (status === 401) redirect('/login');
    // If 403 (Not a member), allow them to see the "Join" page or "Not Found" state
    // But wait, the existing logic redirects to join page if specific error.
    if (error === "Not a member of this private group") {
      redirect(`/groups/join/${groupId}`);
    }

    // Generic 403/404 state
    return (
      <div className="space-y-2 p-4">
        <div>
          <PageHeader
            heading="Access Denied"
            text={error || "You do not have permission to view this group."}
          />
        </div>
        <NoGroupState />
      </div>
    );
  }

  // 2. Fetch Data (Optimized & Secure)
  // We use the authResult to avoid re-fetching membership, but we still need full group details.
  // We pass authResult.userId to fetchGroupDetails to get the sanitized view.
  const groupData = await fetchGroupDetails(groupId, authResult.userId!);
  const { group } = groupData || { group: null };

  if (!group) {
    return (
      <div className="space-y-2 p-4">
        <NoGroupState />
      </div>
    );
  }

  const isAdmin = authResult.isAdmin;

  // 3. Admin-Only Data (Strictly Conditional)
  const [joinRequests, inviteTokensResult] = await Promise.all([
    isAdmin ? fetchGroupRequests(groupId) : Promise.resolve([]),
    isAdmin ? fetchGroupInviteTokens(groupId, authResult.userId!) : Promise.resolve({ data: [] })
  ]);

  const inviteTokens = inviteTokensResult.data || [];

  // 4. Voting Data (Cached)
  const votes = await getVotes(groupId);

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
