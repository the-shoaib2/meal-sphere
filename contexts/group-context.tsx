'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Group, useGroups } from '@/hooks/use-groups';

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
    }
  }, [status, queryClient]);

  // Automatically set the first group as active if none is selected
  useEffect(() => {
    if (status === 'authenticated' && groups.length > 0 && !activeGroup) {
      setActiveGroup(groups[0]);
    }
  }, [status, groups, activeGroup]);

  // Invalidate dashboard queries when active group changes
  useEffect(() => {
    if (activeGroup?.id) {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  }, [activeGroup?.id, queryClient]);

  // Set loading state based on session status
  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status]);

  // Set loading state based on session status, groups loading, and active group initialization
  const contextIsLoading = status === 'loading' || isLoading || (status === 'authenticated' && groupsLoading) || (status === 'authenticated' && !groupsLoading && groups.length > 0 && !activeGroup);

  return (
    <GroupContext.Provider value={{ activeGroup, setActiveGroup, isLoading: contextIsLoading }}>
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
