import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { fetchGroupJoinDetails, resolveInviteToken } from '@/lib/services/groups-service';
import { JoinGroupView } from '@/components/groups/join-group-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Group | Meal Sphere',
  description: 'Join a group to start sharing meals and expenses',
};

export default async function JoinGroupPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/groups/join/' + params.id);
  }

  if (!params.id) {
    notFound();
  }

  let finalGroupId = params.id;
  let inviteToken: string | null = null;

  // First check if params.id is a valid invite token
  const invite = await resolveInviteToken(params.id);
  if (invite) {
    finalGroupId = invite.roomId;
    inviteToken = params.id;
  }

  // Fetch group details server-side
  const data = await fetchGroupJoinDetails(finalGroupId, session.user.id);

  if (!data?.group) {
    notFound();
  }

  // Pass inviter from token if available
  const initialGroup = {
    ...data.group,
    inviter: invite?.createdByUser || null
  };

  return (
    <JoinGroupView
      initialGroup={initialGroup as any}
      initialIsMember={data.isMember}
      initialRequestStatus={data.joinRequest?.status || null}
      groupId={finalGroupId}
      inviteToken={inviteToken}
    />
  );
}
