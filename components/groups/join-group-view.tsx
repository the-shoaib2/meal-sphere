'use client';

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Role } from '@prisma/client';
// import { useGroups } from '@/hooks/use-groups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Lock, Users, UserPlus, Loader2, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupAccess } from '@/hooks/use-group-access';
import { isValidId } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
// Actions import removed

// Update the join room form schema
const joinRoomSchema = z.object({
  message: z.string().optional(),
});

type JoinRoomFormValues = z.infer<typeof joinRoomSchema>;

// Define the base Group interface
interface Group {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount: number;
  maxMembers: number;
  category?: string;
  fineEnabled: boolean;
  fineAmount?: number;
  createdAt: Date;
  tags?: string[];
  inviter?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

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
interface JoinGroupViewProps {
  initialGroup: ExtendedGroup;
  initialIsMember: boolean;
  initialRequestStatus: 'pending' | 'approved' | 'rejected' | null;
  groupId: string;
  inviteToken?: string | null;
}

export function JoinGroupView({ initialGroup, initialIsMember, initialRequestStatus, groupId, inviteToken }: JoinGroupViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams?.get('code') || inviteToken;

  // State
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<ExtendedGroup | null>(initialGroup);
  const [showMessageField, setShowMessageField] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [requestStatus, setRequestStatus] = useState(initialRequestStatus);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Form handling
  const [formValues, setFormValues] = useState<JoinRoomFormValues>({
    message: '',
  });

  // NOTE: removed useGroupAccess logic as data is now passed via props

  // Get resetJoinRequestStatus from useGroups hook
  // const { resetJoinRequestStatus } = useGroups();

  // Handle existing member check on mount
  useEffect(() => {
    if (initialIsMember) {
      toast.success('You are already a member of this group', {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      // We render the "Already a Member" UI view below, user can click to go.
    }
  }, [initialIsMember]);

  // Handle form input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Check join request status from server action
  const checkJoinRequestStatus = useCallback(async (targetGroupId: string) => {
    try {
      setIsCheckingStatus(true);

      const response = await fetch(`/api/groups/${targetGroupId}/join-request/my-request`);
      if (response.ok) {
        const data = await response.json();
        if (data.joinRequest) {
          const status = data.joinRequest.status.toLowerCase();
          setRequestStatus(status as 'pending' | 'approved' | 'rejected');

          // If approved, redirect to group
          if (status === 'approved') {
            toast.success('Your join request has been approved!', {
              icon: <CheckCircle2 className="h-4 w-4" />,
            });
            router.push(`/groups/${targetGroupId}`);
            return;
          }
        } else {
          // No join request found (status 404 or just null)
          setRequestStatus(null);
        }
      } else {
        setRequestStatus(null);
      }
    } catch (error) {
      console.error('Error checking join request status:', error);
      // On error, also reset status
      setRequestStatus(null);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [router]);


  // Handle sending a new request after rejection
  const handleNewRequest = useCallback(async (values: JoinRoomFormValues) => {
    if (!groupId) {
      setError('Invalid group ID');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      // We are just supporting direct joins for now as the invite token logic was complex and client-side specific
      // If we need invite tokens, we'd pass that data down via props as well.

      const targetGroupId = groupId; // Simplified for SSR version

      const response = await fetch(`/api/groups/${targetGroupId}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: values.message })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send join request');
      }

      setRequestStatus('pending');

      toast('Join request sent, waiting for admin approval...', {
        icon: <AlertCircle className="h-4 w-4" />,
      });

      // Check the actual status from API
      await checkJoinRequestStatus(targetGroupId);

      return;
    } catch (error: any) {
      console.error('Error sending join request:', error);
      setError(error.message || 'Failed to send join request');
      toast.error(error.message || 'Failed to send join request', {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsJoining(false);
    }
  }, [groupId, router, checkJoinRequestStatus]);

  // Handle join request submission
  const handleJoinRequest = useCallback(async (values: JoinRoomFormValues) => {
    if (!groupId) {
      setError('Invalid group ID');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const targetGroupId = groupId;

      // Check if this is a public join or private request
      // If we have an invite token, it's a direct join even if private
      if (group?.isPrivate && !inviteToken) {
        // Private Group Flow
        const response = await fetch(`/api/groups/${targetGroupId}/join-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: values.message })
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to send join request');
        }

        setRequestStatus('pending');
        toast.success('Join request sent successfully!');
      } else {
        // Public Group Flow OR Invite Token Flow
        const response = await fetch(`/api/groups/${targetGroupId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteToken: inviteToken || undefined })
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to join group');
        }

        toast.success('Successfully joined the group!');
        router.push(`/groups/${targetGroupId}`);
      }

    } catch (error: any) {
      console.error('Error joining group:', error);
      setError(error.message || 'Failed to join group');
      toast.error(error.message || 'Failed to join group');
    } finally {
      setIsJoining(false);
    }
  }, [groupId, router, group?.isPrivate, inviteToken]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRequest(formValues);
  }, [formValues, handleJoinRequest]);

  // Handle join button click
  const handleJoinClick = useCallback(() => {
    if (group?.isPrivate && !showMessageField) {
      setShowMessageField(true);
      return;
    }

    handleJoinRequest(formValues);
  }, [group?.isPrivate, showMessageField, formValues, handleJoinRequest]);


  // Handle code from URL
  useEffect(() => {
    if (code) {
      setFormValues(prev => ({
        ...prev,
        code
      }));
    }
  }, [code]);

  // Removed useEffect that polled status on mount. We now trust initialRequestStatus passed from server.
  // If needed, we could re-poll, but SSR data is fresh enough for initial render.

  // If user is already a member, show success state
  if (initialIsMember) {
    return (
      <div className="flex items-center justify-center  p-4">
        <div className="w-full max-w-2xl">
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
                onClick={() => router.push(`/groups/${groupId}`)}
                className="mt-4 w-full sm:w-auto"
              >
                Go to Group
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state is handled by the server component (redirects or 404)


  // If no group data, show error state
  if (!group) {
    return (
      <div className="flex items-center justify-center  p-4">
        <div className="w-full max-w-2xl">
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
                className="mt-4 w-full sm:w-auto"
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

  // Show join form if no status or if user wants to send new request
  if (!requestStatus) {
    return (
      <div className="flex items-center justify-center  p-4">
        <div className="w-full max-w-2xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">{group?.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {group?.description || 'No description provided'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Group Type and Inviter Info */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
                    {group?.isPrivate ? (
                      <Lock className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base">
                      {group?.isPrivate ? 'Private Group' : 'Public Group'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {group?.isPrivate
                        ? 'This is a private group. Your join request will need to be approved by an admin.'
                        : 'This is a public group. Anyone can join.'}
                    </p>
                  </div>
                </div>

                {/* Group Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Members</p>
                    <p className="font-medium text-sm sm:text-base">{group?.memberCount} / {group?.maxMembers}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium text-sm sm:text-base">{group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  {group?.fineEnabled && (
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">Fine Amount</p>
                      <p className="font-medium text-sm sm:text-base">₹{group?.fineAmount}</p>
                    </div>
                  )}
                </div>

                {/* Inviter Information */}
                {group?.inviter && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={group.inviter.image} alt={group.inviter.name} />
                      <AvatarFallback className="text-xs sm:text-sm">{group.inviter.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">Invited by {group.inviter.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{group.inviter.email}</p>
                    </div>
                  </div>
                )}

                {/* Join Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  {group?.isPrivate && showMessageField && (
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm">Message to Admins (Optional)</Label>
                      <textarea
                        id="message"
                        name="message"
                        placeholder="Tell the admins why you want to join this group"
                        disabled={isJoining}
                        value={formValues.message}
                        onChange={handleInputChange}
                        className="w-full min-h-[80px] p-3 border rounded-md text-sm resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be sent to the group admins along with your join request.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      disabled={isJoining}
                      className="w-full sm:w-auto"
                    >
                      <Link href="/groups">
                        Cancel
                      </Link>
                    </Button>

                    <Button
                      type={showMessageField ? 'submit' : 'button'}
                      onClick={!showMessageField ? handleJoinClick : undefined}
                      disabled={isJoining}
                      className="w-full sm:w-auto"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {group?.isPrivate ? 'Sending Request...' : 'Joining...'}
                        </>
                      ) : (
                        <>
                          {group?.isPrivate ? (
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center  p-4">
      <div className="w-full max-w-2xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/groups">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Link>
        </Button>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg sm:text-xl">{group?.name}</CardTitle>
                <CardDescription className="text-sm">
                  {group?.description || 'No description provided'}
                </CardDescription>
              </div>
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {requestStatus === 'pending' && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
                {requestStatus === 'rejected' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Rejected
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {/* Status Message */}
              {requestStatus === 'pending' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                    Your join request has been submitted and is currently under review. You will be notified once the administrators make a decision.
                  </p>
                </div>
              )}

              {requestStatus === 'rejected' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-xs sm:text-sm text-destructive-foreground">
                    Your previous join request was not approved. You can try sending a new request with a different message, or contact the group administrators for more information.
                  </p>
                </div>
              )}

              {/* Group Type and Inviter Info */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
                  {group?.isPrivate ? (
                    <Lock className="h-5 w-5 text-primary" />
                  ) : (
                    <Users className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm sm:text-base">
                    {group?.isPrivate ? 'Private Group' : 'Public Group'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {group?.isPrivate
                      ? 'This is a private group. Your join request will need to be approved by an admin.'
                      : 'This is a public group. Anyone can join.'}
                  </p>
                </div>
              </div>

              {/* Group Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Members</p>
                  <p className="font-medium text-sm sm:text-base">{group?.memberCount} / {group?.maxMembers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium text-sm sm:text-base">{group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                {group?.fineEnabled && (
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Fine Amount</p>
                    <p className="font-medium text-sm sm:text-base">₹{group?.fineAmount}</p>
                  </div>
                )}
              </div>

              {/* Inviter Information */}
              {group?.inviter && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={group.inviter.image} alt={group.inviter.name} />
                    <AvatarFallback className="text-xs sm:text-sm">{group.inviter.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">Invited by {group.inviter.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{group.inviter.email}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={() => router.push('/groups')}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Back to Groups
                </Button>

                {requestStatus === 'pending' && (
                  <Button
                    onClick={() => {
                      if (groupId) {
                        checkJoinRequestStatus(groupId);
                      }
                    }}
                    disabled={isCheckingStatus}
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    {isCheckingStatus ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking Status...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Check Status
                      </>
                    )}
                  </Button>
                )}

                {requestStatus === 'rejected' && (
                  <>
                    <Button
                      onClick={() => handleNewRequest(formValues)}
                      disabled={isJoining}
                      variant="default"
                      className="w-full sm:w-auto"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending Request...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Send New Request
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        if (groupId) {
                          checkJoinRequestStatus(groupId);
                        }
                      }}
                      disabled={isCheckingStatus}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {isCheckingStatus ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Check Status
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
