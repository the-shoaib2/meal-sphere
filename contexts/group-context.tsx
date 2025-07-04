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

  // Load active group from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && status !== 'loading') {
      const savedGroup = localStorage.getItem('activeGroup');
      if (savedGroup) {
        try {
          const parsedGroup = JSON.parse(savedGroup);
          // Validate that the saved group has the required fields
          if (parsedGroup && parsedGroup.id && parsedGroup.name) {
            setActiveGroup(parsedGroup);
            // console.log('[GroupContext] Loaded active group:', {
            //   groupName: parsedGroup.name,
            //   userRole: parsedGroup.userRole,
            //   userName: session?.user?.name,
            //   userEmail: session?.user?.email
            // });
          } else {
            // Clear invalid data
            localStorage.removeItem('activeGroup');
          }
        } catch (e) {
          console.error('Failed to parse active group from localStorage', e);
          localStorage.removeItem('activeGroup');
        }
      }
      setIsLoading(false);
    }
  }, [status]);

  // Save active group to localStorage when it changes
  useEffect(() => {
    if (activeGroup && typeof window !== 'undefined') {
      localStorage.setItem('activeGroup', JSON.stringify(activeGroup));
      // console.log('[GroupContext] Active group changed:', {
      //   groupName: activeGroup.name,
      //   userRole: activeGroup.userRole,
      //   userName: session?.user?.name,
      //   userEmail: session?.user?.email
      // });
    } else if (!activeGroup && typeof window !== 'undefined') {
      localStorage.removeItem('activeGroup');
    }
  }, [activeGroup]);

  // Clear active group when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      setActiveGroup(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeGroup');
      }
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

  // Pre-populate cache with localStorage data if available
  useEffect(() => {
    if (session?.user?.id && typeof window !== 'undefined') {
      const savedGroups = localStorage.getItem(`groups-${session.user.id}`);
      if (savedGroups) {
        try {
          const groups = JSON.parse(savedGroups);
          if (Array.isArray(groups) && groups.length > 0) {
            // Set the data in React Query cache
            queryClient.setQueryData(['user-groups', session.user.id], groups);
            // Also set in our in-memory cache
            groupsCache.set(session.user.id, groups);
          }
        } catch (e) {
          console.error('Failed to parse cached groups from localStorage', e);
          localStorage.removeItem(`groups-${session.user.id}`);
        }
      }
    }
  }, [session?.user?.id, queryClient]);

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
