'use client';

import { GroupSettings } from '../group-settings';
import { Settings } from 'lucide-react';

interface SettingsTabProps {
  groupId: string;
  isAdmin: boolean;
  isCreator: boolean;
  onUpdate: () => void;
  onLeave?: () => Promise<void>;
}

export function SettingsTab({
  groupId,
  isAdmin,
  isCreator,
  onUpdate,
  onLeave
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      <div className="p-6 border rounded-lg bg-card">
        <GroupSettings 
          groupId={groupId}
          onUpdate={onUpdate}
          onLeave={onLeave}
          isAdmin={isAdmin}
          isCreator={isCreator}
        />
      </div>
    </div>
  );
} 