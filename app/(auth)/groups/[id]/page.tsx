'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroups } from '@/hooks/use-groups';
import { toast } from 'sonner';
import { Loader2, Users, Settings, ArrowLeft, Lock } from 'lucide-react';
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
      await leaveGroup.mutateAsync(groupId, {
        onSuccess: () => {
          toast.success('You have left the group');
          router.push('/groups');
        },
        onError: (error) => {
          console.error('Error leaving group:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to leave group');
          // Force refresh the page to ensure clean state
          if (typeof window !== 'undefined') {
            window.location.href = '/groups';
          }
        },
        onSettled: () => {
          setIsLeaving(false);
          setShowLeaveDialog(false);
        }
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
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
        
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Members
          </h2>
          <GroupMembers 
            groupId={groupId} 
            isAdmin={isAdmin} 
            currentUserId={session?.user?.id}
            members={(group.members || []).map(member => ({
              ...member,
              roomId: groupId,
              isCurrent: member.userId === session?.user?.id,
              isActive: true,
              lastActive: new Date().toISOString()
            }))}
            onMemberUpdate={() => {
              // Refresh the group data when members are updated
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
          >
            {isLeaving ? 'Leaving...' : 'Leave Group'}
          </Button>
        </div>
      )}

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You won't be able to access it again unless you're re-invited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLeaving}
            >
              {isLeaving ? 'Leaving...' : 'Leave Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
