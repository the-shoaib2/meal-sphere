/**
 * FACADE HOOK - useGroups
 * This hook is now a wrapper around modular hooks to maintain backward compatibility
 */

import { useMyGroups, useGroupsList } from './use-groups-list';
import { useGroupDetails, useGroupStats } from './use-group-details';
import { useGroupMutations } from './use-group-mutations';
import { useGroupMembership } from './use-group-membership';
import { useJoinRequests } from './use-join-requests';
import { useGroupMembers } from './use-group-members';
import { useSession } from 'next-auth/react';

export function useGroups() {
  const { data: session } = useSession();
  const myGroups = useMyGroups();
  const mutations = useGroupMutations();
  const membership = useGroupMembership();

  return {
    // Data
    data: myGroups.data || [], 
    groups: myGroups.data || [],
    isLoading: myGroups.isLoading,
    error: myGroups.error,
    
    // Mutation methods
    createGroup: mutations.createGroup.mutateAsync,
    updateGroup: mutations.updateGroup.mutateAsync,
    deleteGroup: mutations.deleteGroup.mutateAsync,
    
    // Membership methods
    joinGroup: membership.joinGroup.mutateAsync,
    leaveGroup: membership.leaveGroup.mutateAsync,
    
    // Sub-hooks (to be used in components)
    useGroupsList,
    useGroupDetails,
    useGroupStats,
    useJoinRequests,
    useGroupMembers,
  };
}


export default useGroups;
