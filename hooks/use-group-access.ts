import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Role } from '@prisma/client';
import { toast } from 'react-hot-toast';

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
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [isInviteToken, setIsInviteToken] = useState(false);
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);

  useEffect(() => {
    const checkGroupAccess = async () => {
      if (!session?.user?.id) {
        setError('Please sign in to access this page');
        setIsLoading(false);
        onLoading?.(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/groups/${groupId}/access`);
        const data = await response.json();

        if (!response.ok) {
          // Handle 404 for invalid invite token
          if (response.status === 404 && data.isInviteToken) {
            setError('Invalid or expired invite token');
            setCanAccess(false);
            setIsInviteToken(true);
            setIsLoading(false);
            onLoading?.(false);
            return;
          }
          throw new Error(data.error || 'Failed to check group access');
        }

        setIsMember(data.isMember);
        setUserRole(data.userRole);
        setCanAccess(data.canAccess);
        setIsInviteToken(data.isInviteToken);
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
      } catch (error: any) {
        console.error('Error checking group access:', error);
        setError(error.message || 'Failed to check group access');
        setCanAccess(false);
      } finally {
        setIsLoading(false);
        onLoading?.(false);
      }
    };

    checkGroupAccess();
  }, [groupId, session?.user?.id, router, onLoading]);

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