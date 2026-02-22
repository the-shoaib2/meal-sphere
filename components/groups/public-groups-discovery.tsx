import { getPublicGroups } from "@/lib/group-query-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { GroupCard } from "@/components/groups/group-card";
import { Users2, Globe } from "lucide-react";

interface PublicGroupsDiscoveryProps {
    userId?: string;
}

export async function PublicGroupsDiscovery({ userId }: PublicGroupsDiscoveryProps) {
    const publicGroups = await getPublicGroups(6, userId);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <Globe className="h-4 w-4" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Public Communities</h2>
                </div>
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-full">
                    Explore {publicGroups.length}+ groups
                </span>
            </div>

            {publicGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {publicGroups.map((group: any) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            isOwner={group.createdBy === userId}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 rounded-lg bg-muted/30 border-2 border-dashed border-muted">
                    <Users2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium text-center">
                        No public groups are currently available for discovery.
                    </p>
                    <p className="text-sm text-muted-foreground/60 text-center mt-1">
                        Try searching with a specific code or create your own group.
                    </p>
                </div>
            )}
        </div>
    );
}
