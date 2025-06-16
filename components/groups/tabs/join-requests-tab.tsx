'use client';

import { JoinRequests } from '../join-requests';
import { UserPlus } from 'lucide-react';

interface JoinRequestsTabProps {
  groupId: string;
  isAdmin: boolean;
}

export function JoinRequestsTab({
  groupId,
  isAdmin
}: JoinRequestsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Join Requests</h2>
      </div>

      <JoinRequests 
        groupId={groupId}
        isAdmin={isAdmin}
      />
    </div>
  );
} 