'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Role } from '@prisma/client';
import { useGroups } from '@/hooks/use-groups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Lock, Users, UserPlus, Loader2, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupAccess } from '@/hooks/use-group-access';

// Update the join room form schema
const joinRoomSchema = z.object({
  message: z.string().optional(),
});

type JoinRoomFormValues = z.infer<typeof joinRoomSchema>;

// Import Group type from use-groups
import type { Group } from '@/hooks/use-groups';

// Extend Group type with additional UI-specific properties
interface ExtendedGroup extends Group {
  isMember?: boolean;
  hasPassword?: boolean;
  requiresPassword?: boolean;
  joinRequest?: {
    status: 'pending' | 'approved' | 'rejected';
    message?: string;
    createdAt: Date;
  } | null;
  invitation?: {
    role: string;
    expiresAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  } | null;
}

// Add skeleton components
const GroupCardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="flex items-start gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Component implementation
export default function JoinGroupPage() {
  // Hooks must be called unconditionally at the top level
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();

  // Get the group ID from the URL
  const groupId = params?.id as string;
  const code = searchParams?.get('code');

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [group, setGroup] = useState<ExtendedGroup | null>(null);
  const [showMessageField, setShowMessageField] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [isInviteToken, setIsInviteToken] = useState(false);
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Initialize groups hook
  const { joinGroup, getGroupDetails } = useGroups();

  // Form handling
  const [formValues, setFormValues] = useState<JoinRoomFormValues>({
    message: '',
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Use the group access hook
  const {
    isLoading: isAccessLoading,
    error: accessError,
    isMember,
    userRole,
    canAccess,
    isInviteToken: accessIsInviteToken,
    actualGroupId: accessActualGroupId
  } = useGroupAccess({
    groupId,
    onLoading: setIsLoading,
    onError: setError
  });

  // Fetch group details
  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) {
      setError('Invalid group ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if this is an invite token (64 characters)
      if (groupId.length === 64) {
        const response = await fetch(`/api/groups/join/${groupId}`);
        const data = await response.json();

        // Handle already a member case
        if (data.isMember) {
          toast.success('You are already a member of this group', {
            icon: <CheckCircle2 className="h-4 w-4" />,
          });
          if (data.groupId) {
            router.push(`/groups/${data.groupId}`);
          }
          return;
        }

        // Handle used invitation
        if (data.error === 'This invitation has already been used') {
          setError('This invitation has already been used');
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch group details');
        }

        setGroup(data.group);
        setRole(data.role);
        setIsInviteToken(true);
        setActualGroupId(data.group.id);
        return;
      }

      // Regular group join
      const response = await fetch(`/api/groups/${groupId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch group details');
      }

      // Handle already a member case
      if (data.isMember) {
        toast.success('You are already a member of this group', {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        if (groupId) {
          router.push(`/groups/${groupId}`);
        }
        return;
      }

      // Check for existing join request
      if (data.joinRequest) {
        setRequestStatus(data.joinRequest.status);
        if (data.joinRequest.status === 'approved') {
          toast.success('Your join request has been approved!', {
            icon: <CheckCircle2 className="h-4 w-4" />,
          });
          router.push(`/groups/${groupId}`);
          return;
        }
      }

      setGroup(data);
      setIsInviteToken(false);
      setActualGroupId(data.id);
    } catch (error: any) {
      console.error('Error fetching group details:', error);
      setError(error.message || 'Failed to fetch group details');
      toast.error(error.message || 'Failed to fetch group details', {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, router]);

  // Handle join request submission
  const handleJoinRequest = async (values: JoinRoomFormValues) => {
    if (!groupId) {
      setError('Invalid group ID');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      // Check if this is an invite token
      if (isInviteToken) {
        if (!actualGroupId) {
          throw new Error('Invalid invite token');
        }

        const response = await fetch(`/api/groups/join/${groupId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to join group');
        }

        toast.success('Successfully joined the group!', {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        if (actualGroupId) {
          router.push(`/groups/${actualGroupId}`);
        }
        return;
      }

      // Regular group join request
      if (!group || !actualGroupId) {
        throw new Error('Group not found');
      }

      const response = await fetch(`/api/groups/${actualGroupId}/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: values.message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send join request');
      }

      setRequestStatus('pending');
      
      // Show success toast with icon
      toast.success('Join request sent successfully!', {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });

      // Show additional toast for next steps
      toast('Waiting for admin approval...', {
        icon: <AlertCircle className="h-4 w-4" />,
      });

      router.push('/groups');
    } catch (error: any) {
      console.error('Error sending join request:', error);
      setError(error.message || 'Failed to send join request');
      // Show error toast with icon
      toast.error(error.message || 'Failed to send join request', {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRequest(formValues);
  };

  // Handle join button click
  const handleJoinClick = () => {
    if (group?.isPrivate && !showMessageField) {
      setShowMessageField(true);
      return;
    }
    
    handleJoinRequest(formValues);
  };

  // Initial data fetch
  useEffect(() => {
    if (session?.user?.id && groupId) {
      fetchGroupDetails();
    }
  }, [session?.user?.id, groupId, fetchGroupDetails]);

  // Handle code from URL
  useEffect(() => {
    if (code) {
      setFormValues(prev => ({
        ...prev,
        code
      }));
    }
  }, [code]);

  // If access check is loading, show loading state
  if (isAccessLoading) {
    return (
      <div className="flex items-center justify-center ">
        <div className="w-full max-w-2xl px-4">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
          <GroupCardSkeleton />
        </div>
      </div>
    );
  }

  // If user is already a member, show success state
  if (isMember) {
    return (
      <div className="flex items-center justify-center ]">
        <div className="w-full max-w-2xl px-4">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <CardTitle>Already a Member</CardTitle>
              </div>
              <CardDescription>
                You are already a member of this group. Redirecting you to the group page...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push(`/groups/${actualGroupId || groupId}`)} 
                className="mt-4"
              >
                Go to Group
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If there's an access error, show error state
  if (accessError) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Error</CardTitle>
              </div>
              <CardDescription>{accessError}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {accessError === 'This invitation has already been used' 
                    ? 'This invitation link has already been used by another user.'
                    : 'You may not have access to this group or the invitation has expired.'}
                </p>
                <Button 
                  onClick={() => router.push('/groups')} 
                  className="mt-2"
                  variant="outline"
                >
                  Back to Groups
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no group data, show error state
  if (!group) {
    return (
      <div className="flex items-center justify-center ">
        <div className="w-full max-w-2xl px-4">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Error</CardTitle>
              </div>
              <CardDescription>Group not found</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push('/groups')} 
                className="mt-4"
                variant="outline"
              >
                Back to Groups
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Now TypeScript knows group is not null
  const { name, isPrivate } = group;

  // If request is pending, show pending state
  if (requestStatus === 'pending') {
    return (
      <div className="flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Request Pending</CardTitle>
              </div>
              <CardDescription>
                Your join request is pending approval from the group administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  You will be notified when your request is approved or rejected.
                </p>
                <Button 
                  onClick={() => router.push('/groups')} 
                  className="mt-2"
                  variant="outline"
                >
                  Back to Groups
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If request was rejected, show rejected state
  if (requestStatus === 'rejected') {
    return (
      <div className="flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Request Rejected</CardTitle>
              </div>
              <CardDescription>
                Your join request has been rejected by the group administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  You can try joining another group or contact the administrators for more information.
                </p>
                <Button 
                  onClick={() => router.push('/groups')} 
                  className="mt-2"
                  variant="outline"
                >
                  Back to Groups
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center ">
      <div className="w-full max-w-2xl px-4">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/groups">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Join Group</CardTitle>
            <CardDescription>
              {name ? `You're joining: ${name}` : <Skeleton className="h-4 w-48" />}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-start gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
                {isPrivate ? (
                  <Lock className="h-5 w-5 text-primary" />
                ) : (
                  <Users className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">
                  {isPrivate ? 'Private Group' : 'Public Group'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPrivate
                    ? 'This is a private group. Your join request will need to be approved by an admin.'
                    : 'This is a public group. Anyone can join.'}
                </p>

                {isPrivate && !showMessageField && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                    <span>This group requires admin approval to join</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isPrivate && showMessageField && (
                <div className="space-y-2">
                  <Label htmlFor="message">Message to Admins (Optional)</Label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell the admins why you want to join this group"
                    disabled={isJoining}
                    value={formValues.message}
                    onChange={handleInputChange}
                    className="w-full min-h-[100px] p-2 border rounded-md"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be sent to the group admins along with your join request.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  disabled={isJoining}
                >
                  <Link href="/groups">
                    Cancel
                  </Link>
                </Button>

                <Button
                  type={showMessageField ? 'submit' : 'button'}
                  onClick={!showMessageField ? handleJoinClick : undefined}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isPrivate ? 'Sending Request...' : 'Joining...'}
                    </>
                  ) : (
                    <>
                      {isPrivate ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {showMessageField ? 'Send Join Request' : 'Request to Join'}
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4 mr-2" />
                          Join Group
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
