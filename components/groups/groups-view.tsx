'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { Search, Plus, Users, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import type { Group } from '@/hooks/use-groups';
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

interface GroupsViewProps {
    initialData: {
        myGroups: Group[];
        publicGroups: Group[];
        joinRequests: any[];
        timestamp: string;
        executionTime: number;
    };
}

export function GroupsView({ initialData }: GroupsViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [searchQuery, setSearchQuery] = useState('');

    // Get the active tab from URL search params, default to 'my-groups'
    const [activeTab, setActiveTab] = useState(() => {
        const tabFromUrl = searchParams?.get('tab');
        return tabFromUrl && ['my-groups', 'discover'].includes(tabFromUrl)
            ? tabFromUrl
            : 'my-groups';
    });

    // Use initial data, no client-side fetching on mount
    const [groups, setGroups] = useState<Group[]>(
        activeTab === 'my-groups' ? initialData.myGroups : initialData.publicGroups
    );

    // Update groups when tab changes
    useEffect(() => {
        setGroups(activeTab === 'my-groups' ? initialData.myGroups : initialData.publicGroups);
    }, [activeTab, initialData]);

    // Update URL when tab changes
    const handleTabChange = (value: string) => {
        window.dispatchEvent(new Event('routeChangeStart'));
        setActiveTab(value);
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('tab', value);
        router.push(`/groups?${params.toString()}`, { scroll: false });
    };

    // Apply search filter
    const searchedGroups = groups.filter((group: Group) => {
        if (!group) return false;
        const query = searchQuery.toLowerCase();
        return (
            group.name?.toLowerCase().includes(query) ||
            (group.description?.toLowerCase().includes(query) ?? false)
        );
    });

    return (
        <>
            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
            >
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <TabsList>
                        <TabsTrigger value="my-groups">My Groups</TabsTrigger>
                        <TabsTrigger value="discover">Discover</TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search groups..."
                                className="pl-8 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button asChild>
                            <Link href="/groups/create">
                                <Plus className="mr-2 h-4 w-4" />
                                Create
                            </Link>
                        </Button>
                    </div>
                </div>

                <TabsContent value="my-groups">
                    {searchedGroups.length === 0 ? (
                        <EmptyState
                            icon={<Users />}
                            title="No groups yet"
                            description={searchQuery
                                ? "No groups match your search. Try a different term or create a new group."
                                : "You haven't joined any groups yet. Create a new one or browse public groups to get started."}
                            action={
                                <div className="flex gap-2">
                                    <Button asChild>
                                        <Link href="/groups/create">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Group
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleTabChange('discover');
                                            setSearchQuery('');
                                        }}
                                    >
                                        Browse Public Groups
                                    </Button>
                                </div>
                            }
                        />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {searchedGroups.map((group: Group) => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    isOwner={group.createdByUser?.id === session?.user?.id}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="discover">
                    {searchedGroups.length === 0 ? (
                        <EmptyState
                            icon={<Users />}
                            title="No public groups found"
                            description={searchQuery
                                ? "No public groups match your search. Try a different term or create your own group."
                                : "There are no public groups available at the moment. Be the first to create one!"}
                            action={
                                <Button asChild>
                                    <Link href="/groups/create">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Group
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {searchedGroups.map((group: Group) => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    isOwner={group.createdByUser?.id === session?.user?.id}
                                    showLeaveButton={true}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </>
    );
}

interface GroupCardProps {
    group: Group;
    isOwner: boolean;
    showLeaveButton?: boolean;
}

function GroupCard({ group, isOwner, showLeaveButton = false }: GroupCardProps) {
    const { data: session } = useSession();
    const { leaveGroup } = useGroups();
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const displayedMembers = group.members?.slice(0, 3) || [];
    const hasMoreMembers = (group.memberCount || 0) > 3;
    const admin = group.members?.find(member => member.role === 'ADMIN') || group.members?.[0];
    const currentUserMembership = group.members?.find(
        member => member.userId === session?.user?.id
    );
    const userRole = currentUserMembership?.role;
    const privilegedRoles = ['ADMIN', 'MODERATOR', 'MANAGER', 'LEADER', 'MEAL_MANAGER', 'ACCOUNTANT', 'MARKET_MANAGER'];
    const isPrivilegedMember = userRole && privilegedRoles.includes(userRole);
    const isMember = !!currentUserMembership;
    const shouldShowLeaveButton = showLeaveButton && isMember && !isPrivilegedMember && !group.isPrivate;

    const router = useRouter();
    const handleViewGroup = () => {
        window.dispatchEvent(new CustomEvent('routeChangeStart'));
        router.push(`/groups/${group.id}`);
    };

    const handleLeaveGroup = async () => {
        if (!group.id) return;
        try {
            setIsLeaving(true);
            await leaveGroup.mutateAsync(group.id);
            setShowLeaveDialog(false);
        } catch (error) {
            console.error('Error leaving group:', error);
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <>
            <Card className="group hover:shadow-md transition-shadow flex flex-col h-full">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {group.name}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                                {group.description || 'No description provided.'}
                            </CardDescription>
                        </div>
                        {isOwner && (
                            <Badge variant="secondary" className="text-xs">
                                Owner
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    {admin && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Admin</p>
                            <div className="flex items-center gap-2">
                                {admin.user.image ? (
                                    <img
                                        src={admin.user.image}
                                        alt={admin.user.name || 'Admin'}
                                        className="h-6 w-6 rounded-full"
                                    />
                                ) : (
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                        <Users className="h-3 w-3" />
                                    </div>
                                )}
                                <span className="text-sm">{admin.user.name || 'Unknown User'}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                                Members ({group.memberCount || 0})
                            </p>
                        </div>
                        <div className="flex -space-x-2">
                            {displayedMembers.map((member) => (
                                <div key={member.id} className="relative group/member">
                                    {member.user.image ? (
                                        <img
                                            src={member.user.image}
                                            alt={member.user.name || 'Member'}
                                            className="h-8 w-8 rounded-full border-2 border-background"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                                            <Users className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {hasMoreMembers && (
                                <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                                    +{group.memberCount - 3}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                        Created {format(new Date(group.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex gap-2">
                        {shouldShowLeaveButton && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowLeaveDialog(true)}
                                disabled={isLeaving || leaveGroup.isPending}
                            >
                                {isLeaving || leaveGroup.isPending ? (
                                    <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Leaving...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-3 w-3 mr-1" />
                                        Leave
                                    </>
                                )}
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="group/button flex items-center gap-1"
                            onClick={handleViewGroup}
                        >
                            <span>View</span>
                            <ArrowRight className="h-4 w-4 ml-1 transform transition-transform duration-200 group-hover/button:translate-x-1" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <LogOut className="h-5 w-5 text-destructive" />
                            Leave {group.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this group? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLeaving || leaveGroup.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveGroup}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </>
    );
}
