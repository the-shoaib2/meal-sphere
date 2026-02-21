'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, ArrowRight, Lock, UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import type { Group } from '@/types/group';

interface GroupCardProps {
    group: Group;
    isOwner: boolean;
}

function getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function GroupCard({ group, isOwner }: GroupCardProps) {
    const router = useRouter();
    const { data: session } = useSession();

    const displayedMembers = group.members?.slice(0, 3) || [];
    const hasMoreMembers = (group.memberCount || 0) > 3;
    const admin = group.members?.find(member => member.role === 'ADMIN') || group.members?.[0];

    const isMember = group.userRole || group.members?.some(m => m.userId === session?.user?.id) || isOwner;

    const handleAction = () => {
        window.dispatchEvent(new CustomEvent('routeChangeStart'));
        if (isMember) {
            router.push(`/groups/${group.id}`);
        } else {
            router.push(`/groups/join/${group.id}`);
        }
    };

    return (
        <Card className="group hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
            <div className="relative h-32 w-full bg-muted">
                {group.bannerUrl ? (
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
                <div className="absolute top-2 right-2 flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-background/80 hover:bg-background/90 backdrop-blur-sm shadow-sm border-none">
                        {group.isPrivate ? (
                            <div className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</div>
                        ) : (
                            <div className="flex items-center gap-1"><Users className="h-3 w-3" /> Public</div>
                        )}
                    </Badge>
                    {isOwner && (
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 backdrop-blur-sm shadow-sm border-primary/20">
                            Owner
                        </Badge>
                    )}
                </div>
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
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={admin.user.image || undefined} alt={admin.user.name || 'Admin'} />
                                <AvatarFallback className="text-[10px]">
                                    {getInitials(admin.user.name)}
                                </AvatarFallback>
                            </Avatar>
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
                            <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={member.user.image || undefined} alt={member.user.name || 'Member'} />
                                <AvatarFallback className="text-xs">
                                    {getInitials(member.user.name)}
                                </AvatarFallback>
                            </Avatar>
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
                        variant={isMember ? "default" : "outline"}
                        className="group/button flex items-center gap-1"
                        onClick={handleAction}
                    >
                        {isMember ? (
                            <>
                                <span>View</span>
                                <ArrowRight className="h-4 w-4 ml-1 transform transition-transform duration-200 group-hover/button:translate-x-1" />
                            </>
                        ) : (
                            <>
                                <UserPlus className="h-4 w-4 mr-1" />
                                <span>Join</span>
                            </>
                        )}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
