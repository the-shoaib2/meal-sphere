'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Group, useGroups } from '@/hooks/use-groups';
import { encryptData, decryptData } from '@/lib/utils/storage-encryption';

const ENC_KEY = 'ms_active_group_ctx';

type GroupContextType = {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  isLoading: boolean;
};

const GroupContext = createContext<GroupContextType | undefined>(undefined);

// In-memory cache for groups data
const groupsCache = new Map<string, Group[]>();

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const queryClient = useQueryClient();

  // Clear active group when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      setActiveGroup(null);
      // Clear all group-related queries from cache
      queryClient.removeQueries({ queryKey: ['user-groups'] });
      queryClient.removeQueries({ queryKey: ['group'] });
      // Clear in-memory cache
      groupsCache.clear();
      // Clear persisted state
      localStorage.removeItem(ENC_KEY);
    }
  }, [status, queryClient]);

  // Load persisted group or set default
  useEffect(() => {
    if (status === 'authenticated' && groups.length > 0) {
      if (!activeGroup) {
        // Try to recover from local storage
        const storedEncryptedId = localStorage.getItem(ENC_KEY);
        let targetGroup = null;

        if (storedEncryptedId) {
          const decryptedId = decryptData(storedEncryptedId);
          if (decryptedId) {
            targetGroup = groups.find(g => g.id === decryptedId);
          }
        }

        // Fallback to first group if no stored valid ID
        if (!targetGroup) {
          targetGroup = groups[0];
        }

        if (targetGroup) {
          console.log("Restoring active group:", targetGroup.name);
          setActiveGroup(targetGroup);
        }
      }
    }
  }, [status, groups]); // Removed activeGroup from deps to avoid loop if logic was flawed, but here it's fine. Logic: ONLY if !activeGroup.

  // Persist active group changes
  const handleSetActiveGroup = (group: Group | null) => {
    setActiveGroup(group);
    if (group?.id) {
      const encryptedId = encryptData(group.id);
      localStorage.setItem(ENC_KEY, encryptedId);
    } else {
      localStorage.removeItem(ENC_KEY);
    }

    // Also invalidate dashboard immediately if needed
    if (group?.id) {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      // Invalidate legacy specific query keys if needed
    }
  };

  // Invalidate dashboard queries when active group changes (This is redundant with handleSetActiveGroup but good for safety)
  useEffect(() => {
    if (activeGroup?.id) {
      // We already do this in handleSetActiveGroup, but if activeGroup is set via effect (restore), this ensures invalidation.
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  }, [activeGroup?.id, queryClient]);

  // Set loading state based on session status and initial group load
  useEffect(() => {
    if (status !== 'loading' && (!groupsLoading || groups.length === 0)) {
      setIsLoading(false);
    }
  }, [status, groupsLoading, groups]);

  const contextIsLoading = status === 'loading' || isLoading || (status === 'authenticated' && groupsLoading && !activeGroup);

  return (
    <GroupContext.Provider value={{ activeGroup, setActiveGroup: handleSetActiveGroup, isLoading: contextIsLoading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useActiveGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useActiveGroup must be used within a GroupProvider');
  }
  return context;
}
