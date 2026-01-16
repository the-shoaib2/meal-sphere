'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Group } from '@/hooks/use-groups';

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

  // Set loading state based on session status
  const contextIsLoading = status === 'loading' || isLoading;

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
