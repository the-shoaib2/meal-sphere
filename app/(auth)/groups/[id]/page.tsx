'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users, Settings, Activity, UserPlus, CheckSquare } from 'lucide-react';
import { Role } from '@prisma/client';
import { isFeatureEnabled } from '@/lib/utils/features';
import { Badge } from '@/components/ui/badge';
import { MembersTab } from '@/components/groups/tabs/members-tab';
import { SettingsTab } from '@/components/groups/tabs/settings-tab';
import { JoinRequestsTab } from '@/components/groups/tabs/join-requests-tab';
import { ActivityDialog } from '@/components/groups/activity-dialog';
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

  const [showActivityDialog, setShowActivityDialog] = useState(false);

  // Get the active tab from URL search params, default to 'members'
  // Use 'members' as initial state for both server and client to match hydration
  const [activeTab, setActiveTab] = useState('members');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && ['members', 'join-requests', 'voting', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.push(`/groups/${groupId}?${params.toString()}`, { scroll: false });
  };




  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down -> Hide header
        setIsHeaderVisible(false);
      } else {
        // Scrolling up -> Show header
        setIsHeaderVisible(true);
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

  if (isLoading || !group) {
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
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-4 w-64" />
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
              <TabsTrigger value="voting" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 hidden sm:block" />
                Voting
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
        className={`sticky top-0 z-50 flex h-16 items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-0 border-b transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
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
        <div className="ml-auto">
          {showActivityLog && (
            <Button className="h-8 w-8 rounded-full" variant="outline" size="icon" onClick={() => setShowActivityDialog(true)}>
              <Activity className="h-3.5 w-3.5" />
            </Button>
          )}
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
          <TabsTrigger value="voting" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 hidden sm:block" />
            Voting
          </TabsTrigger>
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

      {/* Activity Dialog */}
      <ActivityDialog
        groupId={groupId}
        groupName={group.name}
        isOpen={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        isAdmin={isAdmin}
      />
    </div>
  );
}
