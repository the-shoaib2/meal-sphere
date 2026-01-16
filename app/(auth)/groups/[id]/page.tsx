'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, LogOut, Users, Settings, Activity, UserPlus, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GroupRole } from '@prisma/client';
import { isFeatureEnabled } from '@/lib/features';
import { Badge } from '@/components/ui/badge';
import { MembersTab } from '@/components/groups/tabs/members-tab';
import { SettingsTab } from '@/components/groups/tabs/settings-tab';
import { ActivityTab } from '@/components/groups/tabs/activity-tab';
import { JoinRequestsTab } from '@/components/groups/tabs/join-requests-tab';
import { Skeleton } from '@/components/ui/skeleton';

type ApiMember = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

type GroupWithMembers = {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  maxMembers: number | null;
  members: ApiMember[];
  createdByUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export default function GroupPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session } = useSession();
  const { data: group, isLoading, error, refetch } = useGroups().useGroupDetails(groupId);
  const { leaveGroup } = useGroups();

  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Get the active tab from URL search params, default to 'members'
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams?.get('tab');
    return tabFromUrl && ['members', 'join-requests', 'activity', 'settings'].includes(tabFromUrl)
      ? tabFromUrl
      : 'members';
  });

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.push(`/groups/${groupId}?${params.toString()}`, { scroll: false });
  };

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && ['members', 'join-requests', 'activity', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsHeaderVisible(true);
      } else {
        // Scrolling up
        setIsHeaderVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (error) {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.requiresApproval) {
          handleTabChange('join-requests');
          return;
        }
        toast.error(errorData.message || 'Failed to load group details');
      } catch (e) {
        toast.error('Failed to load group details');
      }
    }
  }, [error]);

  const handleLeaveGroup = async () => {
    if (!groupId) return;

    try {
      setIsLeaving(true);

      // Use the leaveGroup mutation from useGroups hook
      await leaveGroup.mutateAsync(groupId);

      // The mutation will handle the toast and navigation automatically
      // No need to manually show toast or navigate here
    } catch (error) {
      console.error('Error leaving group:', error);
      // The mutation will handle error toasts automatically
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  };

  if (isLoading || isLeaving || !group) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 px-4 sm:px-0">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2 mt-1">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <Tabs defaultValue="members" value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-4 sm:rounded-md">
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4 hidden sm:block" />
                Members
              </TabsTrigger>
              <TabsTrigger value="join-requests" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 hidden sm:block" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4 hidden sm:block" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4 hidden sm:block" />
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="members">
                {/* MembersTab Skeleton */}
                <div className="flex flex-col gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-2 border rounded-md">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="join-requests">
                {/* JoinRequestsTab Skeleton */}
                <div className="flex flex-col gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-2 border rounded-md">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="activity">
                {/* ActivityTab Skeleton */}
                <div className="flex flex-col gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="settings">
                {/* SettingsTab Skeleton */}
                <div className="flex flex-col gap-4 max-w-md">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-10 w-full rounded" />
                  <Skeleton className="h-10 w-1/2 rounded" />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }


  // Find the current user's membership in the group
  const currentUserMembership = Array.isArray(group.members)
    ? group.members.find((member) => member.userId === session?.user?.id)
    : undefined;

  const userRole = currentUserMembership?.role;
  const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'MANAGER';
  const isCreator = group.createdByUser?.id === session?.user?.id;

  type GroupWithExtras = typeof group & {
    features?: Record<string, boolean>;
    category?: string;
    tags?: string[];
  };
  const groupWithExtras = group as GroupWithExtras;
  const features = groupWithExtras.features ?? {};
  const category = groupWithExtras.category ?? '';
  const tags: string[] = groupWithExtras.tags ?? [];

  const showActivityLog = isFeatureEnabled(features, 'activity_log', isAdmin);
  const showJoinRequests = isAdmin;

  // Update the member mapping
  const mappedMembers = Array.isArray(group.members)
    ? group.members.map(member => ({
      id: member.id,
      userId: member.userId,
      roomId: groupId,
      isCurrent: member.userId === session?.user?.id,
      isActive: true,
      lastActive: new Date().toISOString(),
      role: member.role as GroupRole,
      joinedAt: member.joinedAt,
      mutedUntil: null,
      permissions: null,
      user: {
        id: member.user.id,
        name: member.user.name || '',
        email: member.user.email || '',
        image: member.user.image || '',
        createdAt: new Date().toISOString()
      }
    }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`sticky top-0 flex h-16 items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-0 border-b transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {category && (
              <Badge variant="secondary">
                {category}
              </Badge>
            )}
            {tags.length > 0 && tags.map((tag: string) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="members"
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 sm:rounded-md">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4 hidden sm:block" />
            Members
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="join-requests" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 hidden sm:block" />
              Requests
            </TabsTrigger>
          )}
          {showActivityLog && (
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4 hidden sm:block" />
              Activity
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4 hidden sm:block" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-3">
          <TabsContent value="members" className="m-0">
            <MembersTab
              groupId={groupId}
              isAdmin={isAdmin}
              isCreator={isCreator}
              currentUserId={session?.user?.id}
              members={mappedMembers}
              onMemberUpdate={() => {
                refetch();
              }}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="m-0">
              <SettingsTab
                groupId={groupId}
                isAdmin={isAdmin}
                isCreator={isCreator}
                onUpdate={() => {
                  refetch();
                  // toast.success('Group updated successfully');
                }}
              />
            </TabsContent>
          )}

          {showActivityLog && (
            <TabsContent value="activity" className="m-0">
              <ActivityTab
                groupId={groupId}
                isAdmin={isAdmin}
              />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="join-requests" className="m-0">
              <JoinRequestsTab
                groupId={groupId}
                isAdmin={isAdmin}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>

      {!isAdmin && (
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowLeaveDialog(true)}
            disabled={isLeaving || leaveGroup.isPending}
            className="w-full sm:w-auto"
          >
            {isLeaving || leaveGroup.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </>
            )}
          </Button>
        </div>
      )}

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <LogOut className="h-5 w-5 text-destructive" />
              Leave Group
            </AlertDialogTitle>
            <div className="space-y-2 text-sm text-muted-foreground">
              <span>Are you sure you want to leave this group?</span>
              <div className="bg-muted/50 p-3 rounded-md space-y-2">
                <span className="text-sm font-medium">This action will:</span>
                <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Remove you from all group activities</li>
                  <li>Revoke your access to group content</li>
                  <li>Cancel any pending meal registrations</li>
                  <li>Remove you from group notifications</li>
                </ul>
              </div>
              <span className="text-sm text-muted-foreground mt-2">
                You won't be able to access this group again unless you're re-invited.
              </span>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isLeaving || leaveGroup.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLeaving || leaveGroup.isPending}
            >
              {isLeaving || leaveGroup.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                'Leave Group'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
