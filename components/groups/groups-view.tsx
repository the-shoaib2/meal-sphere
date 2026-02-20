'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { Search, Plus, Users, Compass } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { GroupCard } from '@/components/groups/group-card';
import type { Group } from '@/types/group';


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

    const { useGroupsList } = useGroups();

    // Use dynamic queries for groups, hydrated with initialData
    const {
        data: myGroupsData,
    } = useGroupsList({
        filter: 'my',
        initialData: initialData.myGroups
    });

    const {
        data: publicGroupsData,
    } = useGroupsList({
        filter: 'public',
        initialData: initialData.publicGroups
    });

    // Get the active tab from URL search params, default to 'my-groups'
    const [activeTab, setActiveTab] = useState(() => {
        const tabFromUrl = searchParams?.get('tab');
        return tabFromUrl && ['my-groups', 'discover'].includes(tabFromUrl)
            ? tabFromUrl
            : 'my-groups';
    });

    // Determine which groups to show based on active tab
    const groups = activeTab === 'my-groups' ? myGroupsData : publicGroupsData;

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
                    <TabsList className="w-full flex">
                        <TabsTrigger value="my-groups" className="flex-1 flex items-center justify-center gap-2">
                            <Users className="h-4 w-4" />
                            My Groups
                        </TabsTrigger>
                        <TabsTrigger value="discover" className="flex-1 flex items-center justify-center gap-2">
                            <Compass className="h-4 w-4" />
                            Discover
                        </TabsTrigger>
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
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </>
    );
}
