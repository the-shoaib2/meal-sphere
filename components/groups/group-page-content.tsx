"use client"

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

    const [showActivityDialog, setShowActivityDialog] = useState(false);

    // Initialize with prop if valid, otherwise default
    const validTabs = ['members', 'join-requests', 'voting', 'settings'];
    const [activeTab, setActiveTab] = useState(
        validTabs.includes(initialTab) ? initialTab : 'members'
    );

    const [isMounted, setIsMounted] = useState(false);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Prevent hydration mismatch for components that use unique IDs (like Radix Tabs)
    // by ensuring initial render matches server
    const displayActiveTab = isMounted ? activeTab : 'members';

    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    if (currentScrollY > lastScrollY && currentScrollY > 100) {
                        setIsHeaderVisible(false);
                    } else {
                        setIsHeaderVisible(true);
                    }
                    setLastScrollY(currentScrollY);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

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

    const { isAdmin } = initialAccessData;
    const { userRole, isCreator } = initialAccessData;

    if (isLoading || !group) {
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
    const groupWithExtras = group as GroupWithExtras;
    const features = groupWithExtras.features ?? {};
    const category = groupWithExtras.category ?? '';
    const tags: string[] = groupWithExtras.tags ?? [];

    const showActivityLog = isFeatureEnabled(features, 'activity_log', isAdmin);
    const canInvite = isAdmin || !!features?.join_requests;

    const mappedMembers = Array.isArray(group.members)
        ? group.members.map((member: any) => ({
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
                createdAt: member.user.createdAt || new Date(0).toISOString()
            }
        }))
        : [];

    return (
        <div className="flex flex-col gap-4">
            <div
                className={`sticky top-0 flex h-16 items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-0 border-b transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
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
                        {category && <Badge variant="secondary">{category}</Badge>}
                        {tags.length > 0 && tags.map((tag: string) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
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
                            group={group}
                            isAdmin={isAdmin}
                            isCreator={isCreator}
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
                            group={group}
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
                            group={group}
                            initialVotes={initialVotes}
                            currentUser={session?.user}
                        />
                    </TabsContent>
                </div>
            </Tabs>

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

