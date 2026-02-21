'use client';

import React, { createContext, useContext, useEffect, useState, useTransition, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Group } from '@/types/group';
import { encryptData, decryptData } from '@/lib/utils/storage-encryption';
import { toast } from 'react-hot-toast';

const ENC_KEY = 'ms_active_group_ctx';
type GroupContextType = {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  isLoading: boolean;
  isSwitchingGroup: boolean;
  groups: Group[];
  updateGroupData: (groupId: string, data: Partial<Group>) => void;
};

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({
  children,
  initialGroups = [],
  initialActiveGroup = null
}: {
  children: React.ReactNode;
  initialGroups?: Group[];
  initialActiveGroup?: Group | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [switchingToId, setSwitchingToId] = useState<string | null>(null);

  // Sync switchingToId with server data - ensures loader stays visible until refresh is done
  useEffect(() => {
    if (switchingToId && initialActiveGroup?.id === switchingToId) {
      // Small delay for visual consistency
      const timer = setTimeout(() => {
        setSwitchingToId(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialActiveGroup, switchingToId]);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState<Group | null>(initialActiveGroup);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  // Hydrate React Query cache with initial groups
  // And subscribe to updates using useQuery
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['user-groups', session?.user?.id],
    queryFn: () => {
      // If we are here, it means cache was invalid/stale/missing
      // We rely on useGroups hook or other mechanisms to populate this, 
      // or we could fetch it if needed. 
      // For now, if we have initialGroups but queryFn is called, return them or empty.
      return initialGroups;
    },
    initialData: initialGroups,
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // We don't need the hydration useEffect anymore because useQuery with initialData handles it
  // and keeps us subscribed to updates.

  // Set initial active group from server-side data
  useEffect(() => {
    if (initialActiveGroup && !activeGroup) {
      setActiveGroup(initialActiveGroup);

      // Save to localStorage
      try {
        const encrypted = encryptData(JSON.stringify(initialActiveGroup));
        if (typeof window !== 'undefined') {
          localStorage.setItem(ENC_KEY, encrypted);
        }
      } catch (error) {
        console.error('Failed to save initial active group:', error);
      }
    }
  }, [initialActiveGroup]);

  // Clear active group when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      setActiveGroup(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ENC_KEY);
      }
    }
  }, [status]);

  // Load active group from localStorage only if not set from server
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !activeGroup && !initialActiveGroup) {
      try {
        const encrypted = typeof window !== 'undefined' ? localStorage.getItem(ENC_KEY) : null;
        if (encrypted) {
          const decryptedStr = decryptData(encrypted);
          if (decryptedStr) {
            const decrypted = JSON.parse(decryptedStr);
            if (decrypted && typeof decrypted === 'object' && 'id' in decrypted) {
              // Verify the group still exists in user's groups
              const groupExists = groups.find(g => g.id === decrypted.id);
              if (groupExists) {
                setActiveGroup(decrypted as Group);
              } else {
                // Group no longer exists, clear it
                if (typeof window !== 'undefined') {
                  localStorage.removeItem(ENC_KEY);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load active group:', error);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ENC_KEY);
        }
      }
    }
  }, [status, session?.user?.id, groups]);

  // Handle active group invalidation (e.g. user left the active group)
  useEffect(() => {
    // If we have an active group and a loaded groups list, but the active group is NOT in the list
    if (activeGroup && groups.length > 0 && !groups.some(g => g.id === activeGroup.id)) {
      // Find the first available group to fallback to, or null if they left their only group
      const fallbackGroup = groups[0] || null;

      // Use the handler to properly sync context, api, and storage
      handleSetActiveGroup(fallbackGroup);
    } else if (activeGroup && groups.length === 0 && status === 'authenticated' && !isLoading) {
      // If they have NO groups but still have an active group ghost, clear it
      handleSetActiveGroup(null);
    }
  }, [groups, activeGroup, status, isLoading]);

  // Handle setting active group
  const handleSetActiveGroup = async (group: Group | null) => {
    // Show loader IMMEDIATELY — user sees it the instant they click
    setIsApiLoading(true);

    if (!group) {
      // Clear active group
      setActiveGroup(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ENC_KEY);
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });

      startTransition(() => {
        router.refresh();
        setIsApiLoading(false);
      });
      return;
    }

    // Set the target group ID we're switching to
    setSwitchingToId(group.id);

    // Capture previous state for rollback
    const previousGroup = activeGroup;

    // OPTIMISTIC UPDATE: Update UI immediately
    setActiveGroup(group);

    try {
      // Save to localStorage immediately for persistence on reload
      const encrypted = encryptData(JSON.stringify(group));
      if (typeof window !== 'undefined') {
        localStorage.setItem(ENC_KEY, encrypted);
      }

      // Call API to persist the group switch on the server
      const response = await fetch('/api/groups/set-current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId: group.id }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to switch group');
      }

      // Invalidate stale queries
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });

      // Clear API load immediately — switchingToId or isPending will hold the loader line
      setIsApiLoading(false);

      startTransition(() => {
        router.refresh();
      });

    } catch (error) {
      console.error('Failed to switch group:', error);
      toast.error('Failed to switch group. Reverting...');

      // ROLLBACK on error
      setActiveGroup(previousGroup);
      setSwitchingToId(null);
      if (previousGroup) {
        const encrypted = encryptData(JSON.stringify(previousGroup));
        if (typeof window !== 'undefined') {
          localStorage.setItem(ENC_KEY, encrypted);
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ENC_KEY);
        }
      }
      setIsApiLoading(false);
    }
  };

  const updateGroupData = (groupId: string, data: Partial<Group>) => {
    // Update active group if it matches
    if (activeGroup?.id === groupId) {
      const updated = { ...activeGroup, ...data } as Group;
      setActiveGroup(updated);

      // Update local storage
      try {
        const encrypted = encryptData(JSON.stringify(updated));
        if (typeof window !== 'undefined') {
          localStorage.setItem(ENC_KEY, encrypted);
        }
      } catch (error) {
        console.error('Failed to save updated active group:', error);
      }
    }

    // Update query cache
    queryClient.setQueryData(['user-groups', session?.user?.id], (oldGroups: Group[] | undefined) => {
      if (!oldGroups) return oldGroups;
      return oldGroups.map(g => g.id === groupId ? { ...g, ...data } : g);
    });
  };

  // Set loading state based on session status and initial group load
  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status]);

  // Only show loading if session is loading, not if user simply has no groups
  const contextIsLoading = status === 'loading' || isLoading;

  return (
    <GroupContext.Provider value={{
      activeGroup,
      setActiveGroup: handleSetActiveGroup,
      updateGroupData,
      isLoading: contextIsLoading,
      isSwitchingGroup: !!switchingToId || isApiLoading || isPending,
      groups
    }}>
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
