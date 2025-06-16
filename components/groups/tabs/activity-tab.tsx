'use client';

import { ActivityLog } from '../activity-log';
import { History } from 'lucide-react';

interface ActivityTabProps {
  groupId: string;
  isAdmin: boolean;
}

export function ActivityTab({
  groupId,
  isAdmin
}: ActivityTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Activity Log</h2>
      </div>

      <ActivityLog 
        groupId={groupId}
        isAdmin={isAdmin}
      />
    </div>
  );
} 