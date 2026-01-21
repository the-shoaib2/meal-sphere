'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Group } from '@/hooks/use-groups';
import { encryptData, decryptData } from '@/lib/utils/storage-encryption';
import { toast } from 'react-hot-toast';
import { setCurrentGroupAction } from '@/lib/actions/group-actions';

const ENC_KEY = 'ms_active_group_ctx';
type GroupContextType = {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  isLoading: boolean;
  isSwitchingGroup: boolean;
  groups: Group[];
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState<Group | null>(initialActiveGroup);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [isSwitchingGroup, startTransition] = useTransition();
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

  // Handle setting active group
  const handleSetActiveGroup = async (group: Group | null) => {
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
      });
      return;
    }

    // Capture previous state for rollback
    const previousGroup = activeGroup;

    // OPTIMISTIC UPDATE: Update UI immediately
    setActiveGroup(group);

    startTransition(async () => {
      try {
        // Save to localStorage immediately for persistence on reload
        const encrypted = encryptData(JSON.stringify(group));
        if (typeof window !== 'undefined') {
          localStorage.setItem(ENC_KEY, encrypted);
        }

        // Call Server Action instead of API fetch
        const result = await setCurrentGroupAction(group.id);

        if (result?.error) {
          throw new Error(result.error);
        }

        // Surgical invalidation (though Server Action does revalidatePath)
        // Redundant but safe for react-query users
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['periods'] });

        // Router.refresh is handled by revalidatePath in the Server Action,
        // but calling it here within startTransition ensures the UI stays "pending" 
        // until the server render is complete.
        router.refresh();

      } catch (error) {
        console.error('Failed to switch group:', error);
        toast.error('Failed to switch group. Reverting...');

        // ROLLBACK on error
        setActiveGroup(previousGroup);
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
      }
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
    <GroupContext.Provider value={{ activeGroup, setActiveGroup: handleSetActiveGroup, isLoading: contextIsLoading, isSwitchingGroup, groups }}>
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
