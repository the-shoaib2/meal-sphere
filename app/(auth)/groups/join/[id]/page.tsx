'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Role } from '@prisma/client';
import { useGroups } from '@/hooks/use-groups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Lock, Users, UserPlus, Loader2, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

// Define the join room form schema
const joinRoomSchema = z.object({
  password: z.string().optional(),
  code: z.string().optional(),
});

type JoinRoomFormValues = z.infer<typeof joinRoomSchema>;

// Import Group type from use-groups
import type { Group } from '@/hooks/use-groups';

// Extend Group type with additional UI-specific properties
interface ExtendedGroup extends Group {
  isMember?: boolean;
  hasPassword?: boolean;
  requiresPassword?: boolean;
  invitation?: {
    role: string;
    expiresAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  } | null;
}

// Component implementation
export default function JoinGroupPage() {
  // Hooks must be called unconditionally at the top level
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();
  
  // Get the group ID from the URL
  const groupId = params?.id as string;
  const code = searchParams?.get('code');
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [group, setGroup] = useState<ExtendedGroup | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Initialize groups hook
  const { joinGroup, getGroupDetails } = useGroups();

  // Form handling - using uncontrolled form for simplicity
  const [formValues, setFormValues] = useState<JoinRoomFormValues>({
    password: '',
    code: code || '',
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch group details
  const fetchGroupDetails = useCallback(async (password?: string) => {
    if (!groupId || !session?.user?.id) {
      console.error('Missing groupId or user session');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the password parameter if provided, otherwise use formValues.password
      const passwordToUse = password ?? formValues.password;
      
      try {
        // Get group details with the password
        const groupData = await getGroupDetails(groupId, passwordToUse);
        
        // Check if members is an array before using .some()
        const isMember = Array.isArray(groupData.members) 
          ? groupData.members.some((m: any) => m.userId === session.user.id)
          : false;

        // Update group state with the fetched data
        setGroup({
          ...groupData,
          isMember,
          hasPassword: !!groupData.password,
          memberCount: Array.isArray(groupData.members) ? groupData.members.length : 0,
          requiresPassword: false, // Reset requiresPassword flag on success
        });
        
        // Hide password field on successful fetch
        setShowPasswordField(false);
      } catch (error: any) {
        console.error('Error in fetchGroupDetails:', error);
        
        // Handle password required case (PRIVATE_GROUP code or 403 status)
        if (error.code === 'PRIVATE_GROUP' || error.status === 403 || error.message?.includes('private group')) {
          setGroup(prev => ({
            ...prev,
            ...(error.group || {}),
            requiresPassword: true,
            isMember: false,
            hasPassword: true,
            memberCount: error.group?.memberCount || 0,
          }));
          setShowPasswordField(true);
          setError(error.message || 'This is a private group. Please enter the password to join.');
          return;
        }
        
        // Handle invalid password case (INVALID_PASSWORD code or 401 status)
        if (error.code === 'INVALID_PASSWORD' || error.status === 401) {
          setError(error.message || 'Incorrect password. Please try again.');
          setShowPasswordField(true);
          return;
        }
        
        // Handle other errors
        console.error('Unexpected error:', error);
        setError(error.message || 'Failed to fetch group details. Please try again.');
        return;
      }
      
      // Clear any previous password error if the request was successful
      setFormValues(prev => ({
        ...prev,
        passwordError: undefined
      }));
      
      setShowPasswordField(false); // Reset password field visibility on successful fetch

      // If user is already a member, redirect to group page
      if (group?.isMember) {
        router.push(`/groups/${groupId}`);
        return;
      }
    } catch (err: any) {
      console.error('Error fetching group details:', err);
      
      // Handle password required case
      if (err.requiresPassword) {
        // If we have partial group data from the error, use it
        if (err.group) {
          setGroup({
            ...err.group,
            isMember: false,
            hasPassword: true,
            memberCount: err.group.memberCount || 0
          });
        }
        setShowPasswordField(true);
        
        // Set a more specific error message for password requirement
        setError(err.message || 'This is a private group. Please enter the password to join.');
        return;
      }
      
      // Handle invalid password case
      if (err.message?.toLowerCase().includes('invalid password')) {
        setFormValues(prev => ({
          ...prev,
          passwordError: 'Incorrect password. Please try again.'
        }));
        setError('Incorrect password. Please try again.');
        return;
      }
      
      // Handle other errors
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An error occurred while loading group information.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, session?.user?.id, getGroupDetails, router]);
  
  // Handle password submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formValues.password) {
      fetchGroupDetails(formValues.password);
    } else {
      setError('Please enter a password');
    }
  };

  // Handle joining a group
  const handleJoinRoom = async (values: JoinRoomFormValues) => {
    if (!session?.user?.id || !groupId) {
      toast.error('You must be logged in to join a group');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      if (!joinGroup.mutateAsync) {
        throw new Error('Join group functionality is not available');
      }

      // If there's a password in the form values, use it
      const password = values.password || formValues.password;
      
      await joinGroup.mutateAsync({
        groupId,
        password: password || undefined,
      });

      // Update the group state to reflect the user is now a member
      setGroup(prev => prev ? { 
        ...prev, 
        isMember: true,
        memberCount: (prev.memberCount || 0) + 1 
      } : null);

      setJoinSuccess(true);
      toast.success('You have successfully joined the group!');

      setTimeout(() => {
        router.push(`/groups/${groupId}`);
      }, 1500);
    } catch (err) {
      console.error('Error joining room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      toast.error(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRoom(formValues);
  };

  // Handle join button click (shows password field if needed)
  const handleJoinClick = () => {
    if (group?.isPrivate && group?.hasPassword && !showPasswordField) {
      setShowPasswordField(true);
      return;
    }
    
    // If we're showing password field, submit the password form
    if (showPasswordField) {
      handlePasswordSubmit(new Event('submit') as any);
    } else {
      // Otherwise, proceed with normal join
      handleJoinRoom(formValues);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (session?.user?.id && groupId) {
      fetchGroupDetails();
    }
  }, [session?.user?.id, groupId, fetchGroupDetails]);

  // Handle code from URL
  useEffect(() => {
    if (code) {
      setFormValues(prev => ({
        ...prev,
        code
      }));
    }
  }, [code]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading state only if we're still loading and don't have any group data yet
  if (isLoading && !group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state only if we have an error and no group data
  if (error && !group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => fetchGroupDetails(formValues.password)} 
          className="mt-4"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  // If we have group data (either from successful fetch or error response), show the form
  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Group not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/groups">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Join Group</CardTitle>
          <CardDescription>
            {group.name ? `You're joining: ${group.name}` : 'Loading group details...'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-start gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
              {group.isPrivate ? (
                <Lock className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">
                {group.isPrivate ? 'Private Group' : 'Public Group'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {group.isPrivate
                  ? group.hasPassword
                    ? 'This is a private group that requires a password to join.'
                    : 'This is a private group. You need approval to join.'
                  : 'This is a public group. Anyone can join.'}
              </p>

              {group.isPrivate && group.hasPassword && !showPasswordField && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>This group is password protected</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={showPasswordField ? handlePasswordSubmit : handleSubmit} className="space-y-4">
            {group?.isPrivate && group?.hasPassword && !showPasswordField && (
              <div className="space-y-2">
                <Label htmlFor="password">Group Password Required</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <Lock className="h-4 w-4 text-amber-500" />
                  <p className="text-sm text-muted-foreground">
                    This is a private group. Please enter the password to join.
                  </p>
                </div>
              </div>
            )}

            {showPasswordField && group?.isPrivate && group?.hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Group Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter the group password"
                  disabled={isJoining}
                  value={formValues.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ask the group admin for the password if you don't have it.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isJoining}
              >
                <Link href="/groups">
                  Cancel
                </Link>
              </Button>

              <Button
                type={showPasswordField ? 'submit' : 'button'}
                onClick={!showPasswordField ? handleJoinClick : undefined}
                disabled={isJoining || (showPasswordField && !formValues.password?.trim())}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {group?.isPrivate ? 'Joining...' : 'Joining...'}
                  </>
                ) : (
                  <>
                    {group?.isPrivate ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        {showPasswordField ? 'Join with Password' : 'Join Private Group'}
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Join Group
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
