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

        // Soft Navigation: Update URL without full RSC re-render
        // This makes tab switching feel instant because we already have the data
        const params = new URLSearchParams(window.location.search);
        params.set('tab', value);

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);

        // Optional: If we want to notify Next.js router of the change without a full request
        // router.refresh(); // Only if we need to sync server state
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
            <div className="flex flex-col gap-0 -mx-4 sm:mx-0 overflow-hidden sm:rounded-lg border-b sm:border bg-card shadow-sm mb-4 ">
               
                {/* Banner Section */}
                <div className="relative h-20 sm:h-36 w-full bg-muted bg-white/10 dark:bg-black/50 backdrop-blur-[4px] overflow-hidden">
                    {resolvedGroup.bannerUrl ? (
                        <>
                            <img
                                src={resolvedGroup.bannerUrl}
                                alt={resolvedGroup.name}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 bg-white/10 dark:bg-black/10 backdrop-blur-[4px] via-black/20 to-transparent" />
                        </>
                    ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/5 to-primary/10">
                            <Users className="h-16 w-16 text-primary/10" />
                        </div>
                    )}

                    {/* Back Button Overlay */}
                    <div className="absolute top-4 left-4 z-20">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-black/20 hover:bg-primary backdrop-blur-md border-none text-white transition-all shadow-md h-9 w-9"
                            onClick={() => router.push('/groups')}
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </div>
                </div>

                {/* Content Overlap Section */}
                <div className="px-4 sm:px-6 pb-6 pt-4 relative z-10 -mt-10 sm:-mt-12">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white sm:text-foreground drop-shadow-md sm:drop-shadow-none">
                                    {resolvedGroup.name}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <RoleBadge role={userRole} />
                                    <div className="hidden sm:flex items-center gap-2">
                                        {category && <Badge variant="secondary" className="shadow-sm h-5 text-[10px] uppercase font-bold tracking-wider">{category}</Badge>}
                                        {tags.length > 0 && tags.map((tag: string) => (
                                            <Badge key={tag} variant="outline" className="shadow-sm h-5 text-[10px] bg-background/50 backdrop-blur-sm">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex sm:hidden flex-wrap items-center gap-2 pt-1">
                                {category && <Badge variant="secondary" className="shadow-sm h-5 text-[10px] uppercase font-bold tracking-wider">{category}</Badge>}
                                {tags.length > 0 && tags.map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="shadow-sm h-5 text-[10px] bg-background/50 backdrop-blur-sm">{tag}</Badge>
                                ))}
                            </div>

                            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl line-clamp-2">
                                {resolvedGroup.description || "No description provided."}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 sm:shrink-0">
                            {showActivityLog && isMember && (
                                <Button size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-sm bg-background/50 backdrop-blur-sm hover:bg-background transition-all" onClick={() => setShowActivityDialog(true)} title="Activity Log">
                                    <Activity className="h-5 w-5" />
                                </Button>
                            )}
                            {!isMember && (
                                <Button
                                    className="gap-2 shadow-lg transition-all h-10 px-6 rounded-full"
                                    onClick={() => router.push(`/groups/join/${groupId}`)}
                                >
                                    <LogIn className="h-4 w-4" />
                                    Join Group
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                                isActive={displayActiveTab === 'settings'}
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

