import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
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

  const checkAccess = useCallback(async () => {
    if (!groupId || status === 'loading') return;

    try {
      setIsLoading(true);
      onLoading?.(true);
      setError(null);
      onError?.(null);

      // First try to treat it as an invite token
      const response = await fetch(`/api/groups/join/${groupId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        // It's a valid invite token
        setIsInviteToken(true);
        setActualGroupId(result.data.groupId);
        setIsMember(result.data.isMember);
        setUserRole(result.data.role);
        setCanAccess(true);
        onGroupData?.(result.data);
        return;
      }

      // If not an invite token, then validate as a regular group ID
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
      setUserRole(groupData.role);
      setCanAccess(groupData.canAccess);
      onGroupData?.(groupData);
    } catch (error) {
      console.error('Error checking group access:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check group access';
      setError(errorMessage);
      onError?.(errorMessage);
      setCanAccess(false);
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  }, [groupId, status, onLoading, onError, onGroupData]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

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