'use client';

import React from 'react';
import { useEffect, useState, useCallback, useOptimistic, useTransition } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Role } from '@prisma/client';
import { useSession } from 'next-auth/react';
// import { useGroups } from '@/hooks/use-groups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Lock, Users, UserPlus, Loader2, AlertTriangle, ArrowLeft, ShieldAlert, KeyRound, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupAccess } from '@/hooks/use-group-access';
import { isValidId, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/shared/role-badge';
import { PageHeader } from '@/components/shared/page-header';
import { joinGroupAction, createJoinRequestAction, getJoinRequestStatusAction, cancelJoinRequestAction } from '@/lib/actions/group.actions';

// Update the join room form schema
const joinRoomSchema = z.object({
  message: z.string().optional(),
  password: z.string().optional(),
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
  bannerUrl?: string | null;
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
  members?: { userId: string; role: string }[];
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

  const { data: session } = useSession();

  // State
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<ExtendedGroup | null>(initialGroup);
  const [showMessageField, setShowMessageField] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [requestStatus, setRequestStatus] = useState(initialRequestStatus);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    requestStatus,
    (_, newStatus: 'pending' | 'approved' | 'rejected' | null) => newStatus
  );

  // Form handling
  const [formValues, setFormValues] = useState<JoinRoomFormValues>({
    message: '',
    password: '',
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

      const response = await getJoinRequestStatusAction(targetGroupId);
      if (response.success && response.joinRequest) {
        const data = response;
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
          // No join request found
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

  const handleCancelRequest = useCallback(async () => {
    if (!groupId) return;

    startTransition(async () => {
      setOptimisticStatus(null);
      setIsJoining(true);
      try {
        const result = await cancelJoinRequestAction(groupId);

        if (!result.success) {
          throw new Error(result.message || 'Failed to cancel request');
        }

        toast.success('Join request cancelled');
        setRequestStatus(null);
      } catch (error: any) {
        console.error('Error cancelling request:', error);
        toast.error(error.message || 'Failed to cancel request');
        setRequestStatus(requestStatus); // Revert on failure
      } finally {
        setIsJoining(false);
      }
    });
  }, [groupId, requestStatus, setOptimisticStatus]);


  // Handle sending a new request after rejection
  const handleNewRequest = useCallback(async (values: JoinRoomFormValues) => {
    if (!groupId) {
      setError('Invalid group ID');
      return;
    }

    startTransition(async () => {
      setOptimisticStatus('pending');
      setIsJoining(true);
      setError(null);

      try {
        const targetGroupId = groupId;
        const result = await createJoinRequestAction(targetGroupId, { message: values.message });

        if (!result.success) {
          throw new Error(result.message || 'Failed to send join request');
        }

        setRequestStatus('pending');
        toast('Join request sent, waiting for admin approval...', {
          icon: <AlertCircle className="h-4 w-4" />,
        });

        await checkJoinRequestStatus(targetGroupId);
      } catch (error: any) {
        console.error('Error sending join request:', error);
        setError(error.message || 'Failed to send join request');
        toast.error(error.message || 'Failed to send join request');
        setRequestStatus(requestStatus); // Revert
      } finally {
        setIsJoining(false);
      }
    });
  }, [groupId, requestStatus, setOptimisticStatus, checkJoinRequestStatus]);

  // Handle join request submission
  const handleJoinRequest = useCallback(async (values: JoinRoomFormValues) => {
    if (!groupId) {
      setError('Invalid group ID');
      return;
    }

    startTransition(async () => {
      setIsJoining(true);
      setError(null);

      const targetGroupId = groupId;

      try {
        if (group?.isPrivate && !inviteToken) {
          setOptimisticStatus('pending');
          if (values.password && group.hasPassword) {
            const result = await joinGroupAction({ groupId: targetGroupId, password: values.password });
            if (!result.success) throw new Error(result.message || 'Failed to join group');

            if (result.requestCreated) {
              setRequestStatus('pending');
              toast('Join request sent...', { icon: <AlertCircle className="h-4 w-4" /> });
              return;
            }
            toast.success('Successfully joined the group!');
            router.push(`/groups/${targetGroupId}`);
            return;
          }

          const result = await createJoinRequestAction(targetGroupId, { message: values.message });
          if (!result.success) throw new Error(result.message || 'Failed to send join request');
          setRequestStatus('pending');
          toast.success('Join request sent successfully!');
        } else {
          const result = await joinGroupAction({ groupId: targetGroupId, token: inviteToken || undefined });
          if (!result.success) throw new Error(result.message || 'Failed to join group');

          if (result.requestCreated) {
            setOptimisticStatus('pending');
            setRequestStatus('pending');
            toast('Join request sent...', { icon: <AlertCircle className="h-4 w-4" /> });
            return;
          }
          toast.success('Successfully joined the group!');
          router.push(`/groups/${targetGroupId}`);
        }
      } catch (error: any) {
        console.error('Error joining group:', error);
        setError(error.message || 'Failed to join group');
        toast.error(error.message || 'Failed to join group');
        setRequestStatus(requestStatus); // Revert
      } finally {
        setIsJoining(false);
      }
    });
  }, [groupId, router, group?.isPrivate, group?.hasPassword, inviteToken, requestStatus, setOptimisticStatus]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRequest(formValues);
  }, [formValues, handleJoinRequest]);

  // Handle join button click
  const handleJoinClick = useCallback(() => {
    if (formValues.password) {
      handleJoinRequest(formValues);
      return;
    }
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
      <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
        <PageHeader
          heading={group?.name || "Community"}
          description="You're already part of this journey."
          showBackButton
          backHref="/groups"
          badges={<RoleBadge role={group?.members?.find(m => m.userId === session?.user?.id)?.role as any} />}
          badgesNextToTitle={true}
          collapsible={false}
          className="pt-4"
        />
        <div className="flex items-center justify-center pt-8">
          <Card className="w-full max-w-2xl border bg-card shadow-sm rounded-lg">
            <CardHeader className="text-center pb-8 pt-8 bg-muted/30 border-b">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary animate-in zoom-in duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-pretty">Welcome Back!</CardTitle>
              <CardDescription className="text-sm md:text-base max-w-[400px] mx-auto text-pretty">
                You are currently an active member of <strong>{group?.name}</strong>. Step back in to see what's new.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pb-8 pt-6 flex justify-center">
              <Button
                onClick={() => router.push(`/groups/${groupId}`)}
                className="w-full max-w-xs"
              >
                Enter Community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // If no group data, show error state
  if (!group) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
        <div className="flex items-center justify-center pt-24">
          <Card className="w-full max-w-lg border-dashed border-2 bg-muted/30">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle>Discovery Failed</CardTitle>
              <CardDescription>We couldn't find the group you're looking for. The link may be broken or the group has been removed.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button
                onClick={() => router.push('/groups/join')}
                variant="outline"
              >
                Try Another Code
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
  if (!optimisticStatus) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 pb-20 px-4 sm:px-6">
        <PageHeader
          heading="Community Invitation"
          description="Review the details of this community and request your spot at the table."
          showBackButton
          backHref="/groups/join"
          collapsible={false}
          className="pt-4"
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Main Card */}
          <Card className="md:col-span-8 border bg-card shadow-sm rounded-lg overflow-hidden">
            {/* Banner Placeholder or Group Image */}
            <div
              className="h-40 w-full bg-muted flex items-center justify-center border-b relative overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: group?.bannerUrl ? `url(${group.bannerUrl})` : undefined }}
            >
              {/* Overlay for better readability when image is present */}
              {group?.bannerUrl && <div className="absolute inset-0 bg-black/40" />}

              <div className="relative z-10">
                {group?.isPrivate ? (
                  <div className={cn(
                    "flex flex-col items-center gap-2",
                    group?.bannerUrl ? "text-white" : "text-muted-foreground/40"
                  )}>
                    <Lock className="h-10 w-10" />
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      group?.bannerUrl ? "text-white/90" : "text-muted-foreground"
                    )}>Private Space</span>
                  </div>
                ) : (
                  <div className={cn(
                    "flex flex-col items-center gap-2",
                    group?.bannerUrl ? "text-white" : "text-muted-foreground/40"
                  )}>
                    <Users className="h-10 w-10" />
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      group?.bannerUrl ? "text-white/90" : "text-muted-foreground"
                    )}>Public Community</span>
                  </div>
                )}
              </div>
            </div>

            <CardHeader className="px-8 pt-8">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight text-pretty">{group?.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-0.5 border-primary/20 bg-primary/5 text-primary text-[10px] md:text-xs">
                    {group?.isPrivate ? 'Protected' : 'Open Access'}
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-sm md:text-base leading-relaxed text-pretty">
                {group?.description || 'This community hasn\'t provided a description yet, but they\'re excited to have you!'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 space-y-8">
              {/* Group Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-4">
                <div className="space-y-1 p-3 md:p-0 bg-muted/30 md:bg-transparent rounded-lg md:rounded-none">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Members</p>
                  <p className="text-base md:text-lg font-bold">{group?.memberCount} / {group?.maxMembers}</p>
                </div>
                <div className="space-y-1 p-3 md:p-0 bg-muted/30 md:bg-transparent rounded-lg md:rounded-none">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Founded</p>
                  <p className="text-base md:text-lg font-bold">{group?.createdAt ? new Date(group.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>
                {group?.fineEnabled && (
                  <div className="space-y-1 p-3 md:p-0 bg-muted/30 md:bg-transparent rounded-lg md:rounded-none">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Security</p>
                    <p className="text-base md:text-lg font-bold flex items-center gap-1">
                      ₹{group?.fineAmount}
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </p>
                  </div>
                )}
                <div className="space-y-1 p-3 md:p-0 bg-muted/30 md:bg-transparent rounded-lg md:rounded-none">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Category</p>
                  <p className="text-base md:text-lg font-bold">{group?.category || 'General'}</p>
                </div>
              </div>

              {/* Inviter Information */}
              {group?.inviter && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                  <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage src={group.inviter.image} alt={group.inviter.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">{group.inviter.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Your Host</p>
                    <p className="font-bold text-sm truncate">Invited by {group.inviter.name}</p>
                  </div>
                </div>
              )}

              {/* Join Form UI Integration */}
              <form onSubmit={handleSubmit} className="space-y-6 pt-6 border-t border-muted/30">
                {group?.hasPassword && !inviteToken && (
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-semibold">Immediate Access Password</Label>
                    <div className="relative group">
                      <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-blue-600" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter direct entry code..."
                        disabled={isJoining}
                        value={formValues.password || ''}
                        onChange={handleInputChange}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                {group?.isPrivate && !inviteToken && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="message" className="text-sm font-semibold">Message to Host (Recommended)</Label>
                      {!showMessageField && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 h-7 text-xs font-bold"
                          onClick={() => setShowMessageField(true)}
                        >
                          Add Message
                        </Button>
                      )}
                    </div>
                    {showMessageField && (
                      <textarea
                        id="message"
                        name="message"
                        placeholder="Say hi! Tell the admins why you'd like to join..."
                        disabled={isJoining}
                        value={formValues.message}
                        onChange={handleInputChange}
                        className="w-full min-h-[100px] p-4 bg-background border rounded-md text-sm resize-none focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                      />
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type={showMessageField || formValues.password ? 'submit' : 'button'}
                    onClick={(!showMessageField && !formValues.password) ? handleJoinClick : undefined}
                    disabled={isJoining}
                    className="w-full h-11"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Entry...
                      </>
                    ) : (
                      <>
                        {group?.isPrivate && !inviteToken ? (
                          <>
                            <ShieldAlert className="h-4 w-4 mr-2" />
                            {formValues.password ? 'Verify & Join' : (showMessageField ? 'Send Entry Request' : 'Request to Join')}
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Join Community Now
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Sidebar / Info */}
          <div className="md:col-span-4 space-y-6">
            <Card className="border-2 border-dashed transition-all hover:border-primary/40 hover:bg-primary/5 group/expect">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/expect:scale-110 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <CardTitle className="font-bold text-foreground">What to expect</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex gap-3 text-sm text-muted-foreground leading-snug">
                    <div className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="group-hover/expect:text-foreground transition-colors">Coordinate shared meals effortlessly</span>
                  </li>
                  <li className="flex gap-3 text-sm text-muted-foreground leading-snug">
                    <div className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="group-hover/expect:text-foreground transition-colors">Split expenses with total transparency</span>
                  </li>
                  <li className="flex gap-3 text-sm text-muted-foreground leading-snug">
                    <div className="mt-1 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="group-hover/expect:text-foreground transition-colors">Stay synced with real-time notifications</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed transition-all hover:border-orange-400/40 hover:bg-orange-400/5 group/reputation">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <div className="h-10 w-10 rounded-full bg-orange-400/10 flex items-center justify-center text-primary group-hover/reputation:scale-110 transition-transform">
                    <Sparkles className="h-5 w-5 fill-current text-orange-400 " />
                  </div>
                  <CardTitle className="font-bold text-foreground">Global Reputation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-0.5 text-orange-400">
                    {[1, 2, 3, 4, 5].map(i => <Sparkles key={i} className="h-3 w-3 fill-current animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
                    <span className="text-xs font-bold text-foreground ml-2">Trusted Community</span>
                  </div>
                  <p className="text-xs text-muted-foreground group-hover/reputation:text-foreground/80 transition-colors">
                    Join over 5,000+ groups managing meals daily.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 px-4 sm:px-6">
      <PageHeader
        heading="Entry Request"
        description="Monitor the progress of your membership application."
        showBackButton
        backHref="/groups/join"
        collapsible={false}
        className="pt-4"
        badges={
          <div className="flex items-center gap-2">
            {optimisticStatus === 'pending' && (
              <Badge variant="secondary" className="rounded-full px-4 py-1 font-bold">
                <Loader2 className="h-3 w-3 mr-2 animate-spin text-muted-foreground" />
                Under Review
              </Badge>
            )}
            {optimisticStatus === 'rejected' && (
              <Badge variant="destructive" className="rounded-full px-4 py-1 font-bold">
                <XCircle className="h-3 w-3 mr-2" />
                Entry Declined
              </Badge>
            )}
          </div>
        }
        badgesNextToTitle={true}
      />

      <div className="flex items-center justify-center pt-8">
        <Card className="w-full max-w-3xl border bg-card shadow-sm rounded-lg overflow-hidden">
          <CardHeader className="text-center px-6 md:px-8 pt-10 md:pt-12 pb-6 md:pb-8">
            <CardTitle className="text-xl md:text-2xl font-bold text-pretty">Application Status</CardTitle>
            <CardDescription className="text-sm md:text-base max-w-[450px] mx-auto text-pretty">
              Your request to join <strong>{group?.name}</strong> is in progress. Check back soon for updates.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-10 pb-12 space-y-10">
            {/* Status Logic Visuals */}
            {optimisticStatus === 'pending' ? (
              <div className="flex flex-col items-center gap-6 py-8 px-6 bg-muted/50 rounded-lg border border-border">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                  <div className="relative h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                    <Lock className="h-8 w-8" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-bold text-foreground">The hosts are reviewing your request</p>
                  <p className="text-sm text-muted-foreground">
                    A notification has been sent to the group administrators. They typically respond within a few hours.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 py-8 px-6 bg-destructive/5 rounded-lg border border-destructive/10">
                <XCircle className="h-16 w-16 text-destructive" />
                <div className="text-center space-y-2">
                  <p className="font-bold text-destructive">Submission Declined</p>
                  <p className="text-sm text-destructive/70">
                    The administrators were unable to approve your recent join request. You can try resubmitting with a new message.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Group Info Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-6 border-y border-muted-foreground/10">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Community</p>
                <p className="font-bold text-xs md:text-sm truncate px-2">{group?.name}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Type</p>
                <p className="font-bold text-xs md:text-sm">Protected</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Capacity</p>
                <p className="font-bold text-xs md:text-sm">{group?.memberCount} / {group?.maxMembers}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Submitted</p>
                <p className="font-bold text-xs md:text-sm">Recently</p>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {optimisticStatus === 'pending' ? (
                <>
                  <Button
                    onClick={() => groupId && checkJoinRequestStatus(groupId)}
                    disabled={isCheckingStatus}
                    className="flex-1"
                  >
                    {isCheckingStatus ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Check For Approval
                  </Button>
                  <Button
                    onClick={handleCancelRequest}
                    disabled={isJoining}
                    variant="outline"
                    className="flex-1"
                  >
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Withdraw Request
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleNewRequest(formValues)}
                    disabled={isJoining}
                    className="flex-1"
                  >
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Resubmit Application
                  </Button>
                  <Button
                    onClick={handleCancelRequest}
                    disabled={isJoining}
                    variant="outline"
                    className="flex-1"
                  >
                    Clear Decided Request
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
