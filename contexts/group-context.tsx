'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Group } from '@/hooks/use-groups';
import { encryptData, decryptData } from '@/lib/utils/storage-encryption';
import { toast } from 'sonner';

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
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const queryClient = useQueryClient();
  const [isSwitchingGroup, startTransition] = useTransition();

  // Update groups when initialGroups changes
  useEffect(() => {
    if (initialGroups.length > 0) {
      setGroups(initialGroups);
    }
  }, [initialGroups]);

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
    // Optimistically update UI
    setActiveGroup(group);

    if (group) {
      try {
        // Save to localStorage
        const encrypted = encryptData(JSON.stringify(group));
        if (typeof window !== 'undefined') {
          localStorage.setItem(ENC_KEY, encrypted);
        }

        // Update database to set isCurrent flag
        const response = await fetch('/api/groups/set-current', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ groupId: group.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to set current group');
        }

        // Invalidate relevant queries when active group changes
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['meals'] });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['periods'] });

        // Trigger router refresh to update Server Components with transition state
        startTransition(() => {
          router.refresh();
        });
      } catch (error) {
        console.error('Failed to switch group:', error);

        // Show error toast
        toast.error('Failed to switch group', {
          description: 'Please try again or refresh the page.'
        });

        // Revert to previous state on error
        const encrypted = typeof window !== 'undefined' ? localStorage.getItem(ENC_KEY) : null;
        if (encrypted) {
          try {
            const decryptedStr = decryptData(encrypted);
            if (decryptedStr) {
              const previousGroup = JSON.parse(decryptedStr);
              setActiveGroup(previousGroup as Group);
            }
          } catch {
            setActiveGroup(null);
          }
        } else {
          setActiveGroup(null);
        }
      }
    } else {
      // Clear active group
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ENC_KEY);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });

      // Refresh to show empty state with transition state
      startTransition(() => {
        router.refresh();
      });
    }
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
