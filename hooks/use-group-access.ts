import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Role } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { isValidObjectId } from '@/lib/utils';

interface UseGroupAccessProps {
  groupId: string;
  onLoading?: (loading: boolean) => void;
  onError?: (error: string | null) => void;
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
  onError 
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

  useEffect(() => {
    const checkGroupAccess = async () => {
      // Wait for session to be ready
      if (status === 'loading') {
        return;
      }

      // Check if user is authenticated
      if (status === 'unauthenticated' || !session?.user?.id) {
        setError('Please sign in to access this page');
        setIsLoading(false);
        onLoading?.(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // First try to treat it as an invite token
        setIsInviteToken(true);
        const inviteResponse = await fetch(`/api/groups/join/${groupId}`);
        const inviteData = await inviteResponse.json();

        if (inviteResponse.ok) {
          // It's a valid invite token
          setIsMember(inviteData.isMember);
          setUserRole(inviteData.role);
          setCanAccess(true);
          setActualGroupId(inviteData.groupId);

          // If user is already a member, show success message
          if (inviteData.isMember) {
            toast.success('You are already a member of this group', {
              icon: '✓',
            });
            // Redirect after a short delay to allow the user to see the message
            setTimeout(() => {
              router.push(`/groups/${inviteData.groupId}`);
            }, 1500);
            return;
          }
        } else if (inviteResponse.status === 404) {
          // Not an invite token, try as a regular group ID
          setIsInviteToken(false);
          
          // Validate regular group ID format
          if (!isValidObjectId(groupId)) {
            setError('Invalid group ID format');
            setCanAccess(false);
            setIsLoading(false);
            onLoading?.(false);
            return;
          }

          // Regular group access check
          const response = await fetch(`/api/groups/${groupId}/access`);
          const data = await response.json();

          if (!response.ok) {
            if (response.status === 401) {
              setError('Please sign in to access this page');
            } else if (response.status === 404) {
              setError('Group not found');
            } else {
              setError(data.error || 'Failed to check group access');
            }
            setCanAccess(false);
            setIsLoading(false);
            onLoading?.(false);
            return;
          }

          setIsMember(data.isMember);
          setUserRole(data.userRole);
          setCanAccess(data.canAccess);
          setActualGroupId(data.actualId || data.groupId);

          // If user is already a member, show success message
          if (data.isMember) {
            toast.success('You are already a member of this group', {
              icon: '✓',
            });
            // Redirect after a short delay to allow the user to see the message
            setTimeout(() => {
              router.push(`/groups/${data.actualId || data.groupId}`);
            }, 1500);
            return;
          }

          // If user doesn't have access, show error message
          if (!data.canAccess) {
            setError('You do not have access to this group');
            setCanAccess(false);
            return;
          }
        } else {
          // Handle other invite token errors
          if (inviteResponse.status === 401) {
            setError('Please sign in to access this page');
          } else {
            setError(inviteData.error || 'Invalid or expired invite token');
          }
          setCanAccess(false);
          setIsLoading(false);
          onLoading?.(false);
          return;
        }
      } catch (error) {
        console.error('Error checking group access:', error);
        setError(error instanceof Error ? error.message : 'Failed to check group access');
        setCanAccess(false);
      } finally {
        setIsLoading(false);
        onLoading?.(false);
      }
    };

    checkGroupAccess();
  }, [groupId, session?.user?.id, status, router, onLoading]);

  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  return {
    isLoading,
    error,
    isMember,
    userRole,
    canAccess,
    isInviteToken,
    actualGroupId
  };
} 