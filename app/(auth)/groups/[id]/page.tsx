'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { toast } from 'sonner';
import { Loader2, Users, Settings, ArrowLeft, Lock, MessageSquare, ShoppingCart, Utensils, CreditCard, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { GroupMembers } from '@/components/groups/group-members';
import { GroupSettings } from '@/components/groups/group-settings';
import { Role } from '@prisma/client';
import { JoinRequests } from '@/components/groups/join-requests';
import { ActivityLog } from '@/components/groups/activity-log';
import { isFeatureEnabled } from '@/lib/features';
import { InviteCard } from '@/components/groups/invite-card';
import { Badge } from '@/components/ui/badge';


export default function GroupPage() {
  const params = useParams();
  const groupId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { data: group, isLoading, error, refetch } = useGroups().useGroupDetails(
    groupId,
    searchParams?.get('password') || undefined
  );
  
  const [isLeaving, setIsLeaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  
  const { leaveGroup, deleteGroup } = useGroups();

  useEffect(() => {
    if (error) {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.requiresPassword) {
          setRequiresPassword(true);
          setPasswordError(errorData.message);
          return;
        }
        toast.error(errorData.message || 'Failed to load group details');
      } catch (e) {
        toast.error('Failed to load group details');
      }
    }
  }, [error]);

  const handleLeaveGroup = async () => {
    try {
      setIsLeaving(true);
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to leave group');
      }

      toast.success('You have left the group');
      router.push('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave group';
      
      if (errorMessage.includes('CREATOR_CANNOT_LEAVE')) {
        toast.error('Group creator cannot leave. Please transfer ownership or delete the group.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  };



  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setPasswordError('Password is required');
      return;
    }
    // Update URL with password and reload
    const url = new URL(window.location.href);
    url.searchParams.set('password', password);
    window.location.href = url.toString();
  };

  if (isLoading || isLeaving) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Private Group
            </CardTitle>
            <CardDescription>
              This group is password protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Group Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter group password"
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Enter Group
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Group not found</h2>
        <p className="text-muted-foreground mb-6">This group may have been deleted or you no longer have access to it.</p>
        <Button onClick={() => router.push('/groups')}>Back to Groups</Button>
      </div>
    );
  }

  // Find the current user's membership in the group
  const currentUserMembership = Array.isArray(group.members) 
    ? group.members.find((member) => member.userId === session?.user?.id)
    : undefined;
  
  const userRole = currentUserMembership?.role;
  console.log('Current user role:', userRole);
  
  const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'MODERATOR';
  console.log('isAdmin check:', isAdmin);
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

  const showJoinRequests = isFeatureEnabled(features, 'join_requests', isAdmin);
  const showActivityLog = isFeatureEnabled(features, 'activity_log', isAdmin);
  const showMessages = isFeatureEnabled(features, 'messages');
  const showAnnouncements = isFeatureEnabled(features, 'announcements', isAdmin);
  const showShopping = isFeatureEnabled(features, 'shopping');
  const showMeals = isFeatureEnabled(features, 'meals');
  const showPayments = isFeatureEnabled(features, 'payments');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground">{group.description}</p>
            )}
            {category && (
              <Badge variant="secondary" className="mt-2">
                {category}
              </Badge>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {showSettings ? 'Hide Settings' : 'Settings'}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {showSettings && (
          <div className="mb-6 p-6 border rounded-lg bg-card">
            <GroupSettings 
              groupId={groupId} 
              onUpdate={() => {
                refetch();
                toast.success('Group updated successfully');
              }}
              onLeave={!isCreator ? handleLeaveGroup : undefined}
              isAdmin={isAdmin}
              isCreator={isCreator}
            />
          </div>
        )}
        
        {isAdmin && (
          <div className="mb-6">
            <InviteCard groupId={groupId} />
          </div>
        )}

        {showJoinRequests && (
          <JoinRequests groupId={groupId} isAdmin={isAdmin} />
        )}

        {showActivityLog && (
          <ActivityLog groupId={groupId} isAdmin={isAdmin} />
        )}

        {showAnnouncements && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Megaphone className="h-5 w-5 mr-2" />
              Announcements
            </h2>
            {/* Add Announcements component here */}
          </div>
        )}

        {showMessages && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Messages
            </h2>
            {/* Add Messages component here */}
          </div>
        )}

        {showShopping && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Shopping List
            </h2>
            {/* Add ShoppingList component here */}
          </div>
        )}

        {showMeals && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Utensils className="h-5 w-5 mr-2" />
              Meals
            </h2>
            {/* Add Meals component here */}
          </div>
        )}

        {showPayments && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payments
            </h2>
            {/* Add Payments component here */}
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Members
          </h2>
          <GroupMembers 
            groupId={groupId} 
            isAdmin={isAdmin} 
            currentUserId={session?.user?.id}
            isCreator={isCreator}
            members={(group.members || []).map(member => ({
              ...member,
              roomId: groupId,
              isCurrent: member.userId === session?.user?.id,
              isActive: true,
              lastActive: new Date().toISOString(),
              role: member.role as Role,
              user: {
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                image: member.user.image,
                createdAt: (member.user as any).createdAt || new Date().toISOString()
              }
            }))}
            onMemberUpdate={() => {
              refetch();
            }}
          />
        </div>
      </div>

      {!isAdmin && (
        <div className="mt-8 pt-6 border-t">
          <Button 
            variant="destructive" 
            onClick={() => setShowLeaveDialog(true)}
            disabled={isLeaving}
            className="w-full sm:w-auto"
          >
            {isLeaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Leave Group
              </>
            )}
          </Button>
        </div>
      )}

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-destructive" />
              Leave Group
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to leave this group?</p>
              <div className="bg-muted/50 p-3 rounded-md space-y-2">
                <p className="text-sm font-medium">This action will:</p>
                <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Remove you from all group activities</li>
                  <li>Revoke your access to group content</li>
                  <li>Cancel any pending meal registrations</li>
                  <li>Remove you from group notifications</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You won't be able to access this group again unless you're re-invited.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              disabled={isLeaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeaveGroup}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLeaving}
            >
              {isLeaving ? (
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


    </div>
  );
}
