import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from 'react';
import { Role } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { isValidObjectId } from '@/lib/utils';

interface UseGroupAccessProps {
  groupId: string;
  onLoading?: (loading: boolean) => void;
  onError?: (error: string | null) => void;
  onGroupData?: (data: any) => void;
}

interface UseGroupAccessReturn {
  isLoading: boolean;
  error: string | null;
  isMember: boolean;
  userRole: string | null;
  canAccess: boolean;
  isInviteToken: boolean;
  actualGroupId: string | null;
}

// Helper function to check if a string looks like an invite token
function checkIsInviteToken(token: string): boolean {
  // Invite tokens are 10 characters long and contain a mix of letters, numbers, and special characters
  // They are not MongoDB ObjectIds (which are 24 hex characters)
  return token.length === 10 && !isValidObjectId(token);
}

export function useGroupAccess({ 
  groupId, 
  onLoading, 
  onError,
  onGroupData
}: UseGroupAccessProps): UseGroupAccessReturn {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [isInviteToken, setIsInviteToken] = useState(false);
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  const checkAccess = useCallback(async () => {
    if (!groupId || status === 'loading' || isCheckingRef.current) return;

    try {
      isCheckingRef.current = true;
      setIsLoading(true);
      onLoading?.(true);
      setError(null);
      onError?.(null);

      // Check if this is an invite token
      if (checkIsInviteToken(groupId)) {
        setIsInviteToken(true);
        
        // For invite tokens, we need to fetch the token details first
        const tokenResponse = await fetch(`/api/groups/join/${groupId}`);
        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(tokenData.error || 'Invalid or expired invite token');
        }

        // Set the actual group ID from the token data
        setActualGroupId(tokenData.data?.groupId || null);
        
        // Handle the group data
        if (tokenData.data?.group) {
          setIsMember(tokenData.data.isMember || false);
          setUserRole(tokenData.data.role || null);
          setCanAccess(true); // If we can fetch token data, we have access
          onGroupData?.(tokenData.data);
          // console.log('[useGroupAccess] Invite token group:', {
          //   groupName: tokenData.data.group?.name,
          //   userRole: tokenData.data.role,
          //   userName: session?.user?.name,
          //   userEmail: session?.user?.email
          // });
        }
        
        return;
      }

      // For regular group IDs, validate as ObjectId
      if (!isValidObjectId(groupId)) {
        const errorMessage = 'Invalid group ID format. Please check the URL and try again.';
        setError(errorMessage);
        onError?.(errorMessage);
        setCanAccess(false);
        return;
      }

      // Regular group access check
      const groupResponse = await fetch(`/api/groups/${groupId}/access`);
      const groupData = await groupResponse.json();

      if (!groupResponse.ok) {
        throw new Error(groupData.error || 'Failed to check group access');
      }

      setIsMember(groupData.isMember);
      setUserRole(groupData.userRole);
      setCanAccess(groupData.canAccess);
      onGroupData?.(groupData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check group access';
      setError(errorMessage);
      onError?.(errorMessage);
      setCanAccess(false);
    } finally {
      setIsLoading(false);
      onLoading?.(false);
      isCheckingRef.current = false;
    }
  }, [groupId, status, onLoading, onError, onGroupData]);

  useEffect(() => {
    // Only check access if we have a groupId and session is loaded
    if (groupId && status !== 'loading') {
      checkAccess();
    }
  }, [groupId, status, checkAccess]);

  return {
    isLoading,
    error,
    isMember,
    userRole,
    canAccess,
    isInviteToken,
    actualGroupId,
  };
} 