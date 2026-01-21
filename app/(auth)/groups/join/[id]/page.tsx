import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { fetchGroupJoinDetails } from '@/lib/services/groups-service';
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

  // Fetch group details server-side
  const data = await fetchGroupJoinDetails(params.id, session.user.id);

  if (!data?.group) {
    notFound();
  }

  return (
    <JoinGroupView
      initialGroup={data.group as any}
      initialIsMember={data.isMember}
      initialRequestStatus={data.joinRequest?.status || null}
      groupId={data.group.id}
    />
  );
}
