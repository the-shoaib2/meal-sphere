'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { Search, Plus, Users, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import type { Group } from '@/hooks/use-groups';

export default function GroupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  // Get the active tab from URL search params, default to 'all-groups'
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams?.get('tab');
    return tabFromUrl && ['all-groups', 'my-groups', 'discover'].includes(tabFromUrl)
      ? tabFromUrl
      : 'all-groups';
  });

  const {
    data: groups = [],
    isLoading,
    error
  } = useGroups();

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    window.dispatchEvent(new Event('routeChangeStart'));
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.push(`/groups?${params.toString()}`, { scroll: false });
  };

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && ['all-groups', 'my-groups', 'discover'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Filter groups based on active tab
  const filteredGroups = (groups || []).filter((group: Group) => {
    if (!group) return false;
    if (activeTab === 'my-groups') {
      return group.createdByUser?.id === session?.user?.id;
    }
    if (activeTab === 'discover') {
      return !group.isPrivate; // Show only public groups in discover
    }
    return true; // For all-groups tab, show all groups
  });
  const filterError = error;

  // Apply search filter with type safety
  const searchedGroups = filteredGroups.filter((group: Group) => {
    if (!group) return false;
    const query = searchQuery.toLowerCase();
    return (
      group.name?.toLowerCase().includes(query) ||
      (group.description?.toLowerCase().includes(query) ?? false)
    );
  });

  const isLoadingState = isLoading;
  const errorState = error;

  if (isLoadingState) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<AlertCircle />}
          title="Error loading groups"
          description={errorState.message || "There was an error loading your groups. Please try again later."}
          action={
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground text-sm">
            Join existing groups or create your own to start planning meals together.
          </p>
        </div>
        <Button asChild>
          <Link href="/groups/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Link>
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="all-groups">All Groups</TabsTrigger>
            <TabsTrigger value="my-groups">My Groups</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search groups..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
              {filteredGroups.map((group: Group, index) => (
                <GroupCard
                  key={`${group.id}-${index}`}
                  group={group}
                  isOwner={group.createdByUser?.id === session?.user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-groups">
          {searchedGroups.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No groups found"
              description={searchQuery
                ? "No groups match your search. Try a different term or create a new group."
                : "There are no groups available at the moment. Be the first to create one!"}
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
              {filteredGroups.map((group: Group, index) => (
                <GroupCard
                  key={`all-${group.id}-${index}`}
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
              {filteredGroups.map((group: Group, index) => (
                <GroupCard
                  key={`discover-${group.id}-${index}`}
                  group={group}
                  isOwner={group.createdByUser?.id === session?.user?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface GroupCardProps {
  group: Group;
  isOwner: boolean;
}

function GroupCard({ group, isOwner }: GroupCardProps) {
  // Get the first 3 members to display
  const displayedMembers = group.members?.slice(0, 3) || [];
  const hasMoreMembers = (group.memberCount || 0) > 3;

  // Get the admin (first member with ADMIN role or first member if no admin found)
  const admin = group.members?.find(member => member.role === 'ADMIN') || group.members?.[0];

  const router = useRouter();
  const handleViewGroup = () => {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
    router.push(`/groups/${group.id}`);
  };

  return (
    <Card className="group hover:shadow-md transition-shadow flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {group.name}
              {group.isPrivate && (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
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
        {/* Admin Section */}
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
              <span className="text-sm">
                {admin.user.name || 'Unknown User'}
                {admin.role === 'ADMIN' && (
                  <span className="ml-1 text-xs text-muted-foreground">(Admin)</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Members Section */}
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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-foreground text-background rounded opacity-0 group-hover/member:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {member.user.name || 'Unknown User'}
                  {member.role === 'ADMIN' && ' (Admin)'}
                </div>
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
        <Button
          size="sm"
          className="group/button flex items-center gap-1 overflow-hidden"
          onClick={handleViewGroup}
        >
          <span>View Group</span>
          <ArrowRight className="h-4 w-4 ml-1 transform transition-transform duration-200 group-hover/button:translate-x-1 group-focus-visible/button:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
