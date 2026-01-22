'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { useGroups } from '@/hooks/use-groups';
import { Search, Plus, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
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

    // const { useGroupsList } = useGroups();

    // Get the active tab from URL search params, default to 'my-groups'
    const [activeTab, setActiveTab] = useState(() => {
        const tabFromUrl = searchParams?.get('tab');
        return tabFromUrl && ['my-groups', 'discover'].includes(tabFromUrl)
            ? tabFromUrl
            : 'my-groups';
    });

    // const { myGroups } = initialData;
    // const { publicGroups } = initialData;
    const myGroups = initialData.myGroups;
    const publicGroups = initialData.publicGroups;

    // Determine which groups to show based on active tab
    const groups = activeTab === 'my-groups' ? myGroups : publicGroups;

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
                    <TabsList className="w-fit">
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
}

function GroupCard({ group, isOwner }: GroupCardProps) {

    const displayedMembers = group.members?.slice(0, 3) || [];
    const hasMoreMembers = (group.memberCount || 0) > 3;
    const admin = group.members?.find(member => member.role === 'ADMIN') || group.members?.[0];

    const router = useRouter();
    const handleViewGroup = () => {
        window.dispatchEvent(new CustomEvent('routeChangeStart'));
        router.push(`/groups/${group.id}`);
    };

    return (
        <>
            <Card className="group hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
                <div className="relative h-32 w-full bg-muted">
                    {group.bannerUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={group.bannerUrl}
                            alt={group.name}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full bg-primary/10">
                            <Users className="h-10 w-10 text-primary/40" />
                        </div>
                    )}
                    {isOwner && (
                        <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs bg-background/80 hover:bg-background/90 backdrop-blur-sm shadow-sm">
                                Owner
                            </Badge>
                        </div>
                    )}
                </div>
                <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {group.name}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                                {group.description || 'No description provided.'}
                            </CardDescription>
                        </div>
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

        </>
    );
}
