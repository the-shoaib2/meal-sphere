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

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Load active group from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGroup = localStorage.getItem('activeGroup');
      if (savedGroup) {
        try {
          setActiveGroup(JSON.parse(savedGroup));
        } catch (e) {
          console.error('Failed to parse active group from localStorage', e);
        }
      }
      setIsLoading(false);
    }
  }, []);

  // Save active group to localStorage when it changes
  useEffect(() => {
    if (activeGroup) {
      localStorage.setItem('activeGroup', JSON.stringify(activeGroup));
    }
  }, [activeGroup]);

  // Clear active group when user logs out
  useEffect(() => {
    if (!session) {
      setActiveGroup(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeGroup');
      }
    }
  }, [session]);

  // Invalidate dashboard queries when active group changes
  useEffect(() => {
    if (activeGroup?.id) {
      console.log('Active group changed, invalidating dashboard queries:', activeGroup.id);
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  }, [activeGroup?.id, queryClient]);

  return (
    <GroupContext.Provider value={{ activeGroup, setActiveGroup, isLoading }}>
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
