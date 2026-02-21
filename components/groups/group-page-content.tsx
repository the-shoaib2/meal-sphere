"use client"

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users, Settings, Activity, UserPlus, CheckSquare, LogIn } from 'lucide-react';
import { Role } from '@prisma/client';
import { isFeatureEnabled } from '@/lib/utils/features';
import { Badge } from '@/components/ui/badge';
import { MembersTab } from '@/components/groups/tabs/members-tab';
import { SettingsTab } from '@/components/groups/tabs/settings-tab';
import { JoinRequestsTab } from '@/components/groups/tabs/join-requests-tab';
import { ActivityDialog } from '@/components/groups/activity-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { RoleBadge } from '@/components/shared/role-badge';

interface GroupPageContentProps {
    groupId: string;
    initialData: any;
    initialAccessData: any;
    joinRequests?: any[];
    initialVotes?: any[];
    initialInviteTokens?: any[];
    initialTab?: string;
}

import { VotingTab } from '@/components/groups/tabs/voting-tab';

import { useGroups } from '@/hooks/use-groups';

export function GroupPageContent(
    {
        groupId,
        initialData,
        initialAccessData,
        joinRequests,
        initialVotes = [],
        initialInviteTokens = [],
        initialTab = 'members'
    }: GroupPageContentProps
) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    // Use group details hook with initial data
    const { useGroupDetails } = useGroups();
    const { data: group, isLoading, error, refetch } = useGroupDetails(groupId, initialData);
    const resolvedGroup = group || initialData;

    const [showActivityDialog, setShowActivityDialog] = useState(false);

    // Initialize with prop if valid, otherwise default
    const validTabs = ['members', 'join-requests', 'voting', 'settings'];
    const [activeTab, setActiveTab] = useState(
        validTabs.includes(initialTab) ? initialTab : 'members'
    );

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Use the actual activeTab state directly. It's initialized from initialTab prop
    // which is consistent between server and client.
    const displayActiveTab = activeTab;


    useEffect(() => {
        if (error) {
            try {
                // @ts-ignore
                const errorData = JSON.parse(error.message || '{}');
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

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        // Correctly handle both URLSearchParams (client-side) and plain object (server-side)
        const params = new URLSearchParams(
            typeof searchParams?.get === 'function'
                ? searchParams.toString()
                : (searchParams as any)
        );
        params.set('tab', value);
        router.push(`/groups/${groupId}?${params.toString()}`, { scroll: false });
    };

    const { isMember, isAdmin, userRole, isCreator } = initialAccessData;

    // Stabilize the loading state: if we have initialData, don't show skeleton during hydration
    if ((isLoading || !group) && !initialData) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:gap-6">
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
                    <Tabs defaultValue="members" value={activeTab} className="w-full">
                        <TabsList className="w-full flex justify-start sm:rounded-md">
                            <TabsTrigger value="members" className="flex-1 flex items-center justify-center gap-2">
                                <Users className="h-4 w-4 hidden sm:block" />
                                Members
                            </TabsTrigger>
                            {isAdmin && (
                                <TabsTrigger value="join-requests" className="flex-1 flex items-center justify-center gap-2">
                                    <UserPlus className="h-4 w-4 hidden sm:block" />
                                    Requests
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="voting" className="flex-1 flex items-center justify-center gap-2">
                                <CheckSquare className="h-4 w-4 hidden sm:block" />
                                Voting
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="flex-1 flex items-center justify-center gap-2">
                                <Settings className="h-4 w-4 hidden sm:block" />
                                Settings
                            </TabsTrigger>
                        </TabsList>
                        <div className="mt-6">
                            <TabsContent value="members">
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
                        </div>
                    </Tabs>
                </div>
            </div>
        );
    }

    // Keep local feature flags and tags logic
    type GroupWithExtras = typeof group & {
        features?: Record<string, boolean>;
        category?: string;
        tags?: string[];
    };
    const groupWithExtras = resolvedGroup as GroupWithExtras;
    const features = groupWithExtras.features ?? {};
    const category = groupWithExtras.category ?? '';
    const tags: string[] = groupWithExtras.tags ?? [];

    const showActivityLog = isFeatureEnabled(features, 'activity_log', isAdmin);
    const canInvite = isAdmin || !!features?.join_requests;

    const mappedMembers = useMemo(() => {
        if (!resolvedGroup?.members || !Array.isArray(resolvedGroup.members)) return [];
        return resolvedGroup.members.map((member: any) => ({
            id: member.id,
            userId: member.userId,
            roomId: groupId,
            isCurrent: member.userId === session?.user?.id,
            isActive: true,
            // Use member's lastActive or a stable epoch as a baseline to prevent hydration mismatch from new Date()
            lastActive: member.lastActive || new Date(0).toISOString(),
            role: member.role as Role,
            joinedAt: member.joinedAt,
            mutedUntil: null,
            permissions: null,
            user: {
                id: member.user.id,
                name: member.user.name || '',
                email: member.user.email || '',
                image: member.user.image || '',
                createdAt: member.user.createdAt || new Date(0).toISOString()
            }
        }));
    }, [group?.members, session?.user?.id, groupId]);

    return (
        <div className="flex flex-col gap-4">
            <PageHeader
                heading={resolvedGroup.name}
                showBackButton
                backHref="/groups"
                description={
                    <div className="flex flex-col gap-1.5">
                        <div className="flex sm:hidden flex-wrap items-center gap-1.5 mb-1">
                            {category && <Badge variant="secondary" className="shadow-sm text-[10px] px-2 py-0.5">{category}</Badge>}
                            {tags.length > 0 && tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="shadow-sm text-[10px] px-2 py-0.5">{tag}</Badge>
                            ))}
                        </div>
                        <span className="text-muted-foreground/90 font-medium text-sm">
                            {resolvedGroup.description}
                        </span>
                    </div>
                }
                badgesNextToTitle={true}
                collapsible={false}
                badges={
                    <div className="flex items-center gap-2">
                        <RoleBadge role={userRole} />
                        <div className="hidden sm:flex items-center gap-2">
                            {category && <Badge variant="secondary" className="shadow-sm">{category}</Badge>}
                            {tags.length > 0 && tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="shadow-sm">{tag}</Badge>
                            ))}
                        </div>
                    </div>
                }
            >
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {showActivityLog && isMember && (
                        <Button size="icon" variant="outline" className="h-9 w-9 rounded-full shadow-sm" onClick={() => setShowActivityDialog(true)} title="Activity Log">
                            <Activity className="h-4 w-4" />
                        </Button>
                    )}
                    {!isMember && (
                        <Button

                            className="gap-2 shadow-md hover:shadow-lg transition-all"
                            onClick={() => router.push(`/groups/join/${groupId}`)}
                        >
                            <LogIn className="h-4 w-4" />
                            Join Group
                        </Button>
                    )}
                </div>
            </PageHeader>

            {isMember ? (
                <Tabs defaultValue="members" value={displayActiveTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="w-full flex justify-start sm:rounded-md">
                        <TabsTrigger value="members" className="flex-1 flex items-center justify-center gap-2">
                            <Users className="h-4 w-4 hidden sm:block" />
                            Members
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="join-requests" className="flex-1 flex items-center justify-center gap-2">
                                <UserPlus className="h-4 w-4 hidden sm:block" />
                                Requests
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="voting" className="flex-1 flex items-center justify-center gap-2">
                            <CheckSquare className="h-4 w-4 hidden sm:block" />
                            Voting
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex-1 flex items-center justify-center gap-2">
                            <Settings className="h-4 w-4 hidden sm:block" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-3">
                        <TabsContent value="members" className="m-0">
                            <MembersTab
                                groupId={groupId}
                                group={resolvedGroup}
                                isAdmin={isAdmin}
                                isCreator={isCreator}
                                isMember={isMember}
                                currentUserId={session?.user?.id}
                                members={mappedMembers}
                                onMemberUpdate={() => refetch()}
                                initialInviteTokens={initialInviteTokens}
                                canInvite={canInvite}
                            />
                        </TabsContent>

                        <TabsContent value="settings" className="m-0">
                            <SettingsTab
                                groupId={groupId}
                                group={resolvedGroup}
                                isAdmin={isAdmin}
                                isCreator={isCreator}
                                onUpdate={() => refetch()}
                            />
                        </TabsContent>

                        {isAdmin && (
                            <TabsContent value="join-requests" className="m-0">
                                <JoinRequestsTab
                                    groupId={groupId}
                                    isAdmin={isAdmin}
                                    initialRequests={joinRequests}
                                />
                            </TabsContent>
                        )}

                        <TabsContent value="voting" className="m-0">
                            <VotingTab
                                group={resolvedGroup}
                                initialVotes={initialVotes}
                                currentUser={session?.user}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            ) : (
                <div className="mt-3">
                    <MembersTab
                        groupId={groupId}
                        group={resolvedGroup}
                        isAdmin={false}
                        isCreator={false}
                        isMember={false}
                        currentUserId={session?.user?.id}
                        members={mappedMembers}
                        onMemberUpdate={() => { }}
                        initialInviteTokens={[]}
                        canInvite={false}
                    />
                </div>
            )}

            <ActivityDialog
                groupId={groupId}
                groupName={resolvedGroup.name}
                isOpen={showActivityDialog}
                onOpenChange={setShowActivityDialog}
                isAdmin={isAdmin}
            />
        </div>
    );
}

