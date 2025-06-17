'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, LogOut, Users, Settings, Activity, UserPlus } from 'lucide-react';
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
import { Role } from '@prisma/client';
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
  const groupId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session } = useSession();
  const { data: group, isLoading, error, refetch } = useGroups().useGroupDetails(groupId);

  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [activeTab, setActiveTab] = useState('members');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { leaveGroup } = useGroups();

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
          setActiveTab('join-requests');
          setPendingRequests(errorData.pendingRequests || 0);
          return;
        }
        toast.error(errorData.message || 'Failed to load group details');
      } catch (e) {
        toast.error('Failed to load group details');
      }
    }
  }, [error]);

  const handleLeaveGroup = async () => {
    try {
      setIsLeaving(true);
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave group');
      }

      toast.success('You have left the group');
      router.push('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave group';

      if (errorMessage.includes('CREATOR_CANNOT_LEAVE')) {
        toast.error('Group creator cannot leave. Please transfer ownership or delete the group.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  };

  if (isLoading || isLeaving) {
    return (
      <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center gap-4 px-4 sm:px-0">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>

          <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <MembersTab
                  groupId={groupId}
                  isAdmin={false}
                  isCreator={false}
                  currentUserId={session?.user?.id}
                  members={[]}
                  onMemberUpdate={() => { }}
                />
              </TabsContent>

              <TabsContent value="join-requests">
                <JoinRequestsTab
                  groupId={groupId}
                  isAdmin={false}
                />
              </TabsContent>

              <TabsContent value="activity">
                <ActivityTab
                  groupId={groupId}
                  isAdmin={false}
                />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsTab
                  groupId={groupId}
                  isAdmin={false}
                  isCreator={false}
                  onUpdate={() => { }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Group not found</h2>
        <p className="text-muted-foreground mb-6">This group may have been deleted or you no longer have access to it.</p>
        <Button onClick={() => router.push('/groups')}>Back to Groups</Button>
      </div>
    );
  }

  // Find the current user's membership in the group
  const currentUserMembership = Array.isArray(group.members)
    ? group.members.find((member) => member.userId === session?.user?.id)
    : undefined;

  const userRole = currentUserMembership?.role;
  const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'MODERATOR';
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
      role: member.role as Role,
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
        className={`sticky top-0 z-30 flex h-16 items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-0 border-b transition-transform duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
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
        onValueChange={setActiveTab}
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
              {pendingRequests > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests}
                </Badge>
              )}
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
                  toast.success('Group updated successfully');
                }}
                onLeave={!isCreator ? handleLeaveGroup : undefined}
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
            disabled={isLeaving}
            className="w-full sm:w-auto"
          >
            {isLeaving ? (
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
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to leave this group?</p>
              <div className="bg-muted/50 p-3 rounded-md space-y-2">
                <p className="text-sm font-medium">This action will:</p>
                <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Remove you from all group activities</li>
                  <li>Revoke your access to group content</li>
                  <li>Cancel any pending meal registrations</li>
                  <li>Remove you from group notifications</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You won't be able to access this group again unless you're re-invited.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isLeaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLeaving}
            >
              {isLeaving ? (
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
