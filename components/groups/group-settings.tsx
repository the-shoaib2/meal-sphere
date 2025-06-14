'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, Save, Lock, ShieldAlert, Loader2, Check, AlertCircle, UserPlus, Users ,LogOut,} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,  } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useGroups } from '@/hooks/use-groups';
import { InviteCard } from './invite-card';
import { useToast } from '@/components/ui/use-toast';
import { Dialog,DialogDescription, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const groupSettingsSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  isPrivate: z.boolean(),
  password: z.string().optional(),
  maxMembers: z.number().min(2).max(100).optional().nullable(),
});

type GroupSettingsFormValues = z.infer<typeof groupSettingsSchema>;

interface GroupSettingsProps {
  /** The ID of the group */
  groupId: string;
  /** Callback function called when the group is successfully updated */
  onUpdate: () => void;
  /** Callback function called when the leave action is triggered */
  onLeave?: () => Promise<void> | void;
  /** Whether the current user is an admin of the group */
  isAdmin?: boolean;
  /** Whether the current user is the group creator */
  isCreator?: boolean;
}

export function GroupSettings({ 
  groupId, 
  onUpdate, 
  onLeave,
  isAdmin = false,
  isCreator = false,
}: GroupSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { deleteGroup, useGroupDetails, updateGroup } = useGroups();
  const { data: group, isLoading: isLoadingGroup, refetch } = useGroupDetails(groupId);
  const { toast } = useToast();

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    
    try {
      setIsDeleting(true);
      await deleteGroup.mutateAsync(groupId);
      // The onSuccess handler in useGroups will handle the navigation and toast
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };



  const defaultValues: Partial<GroupSettingsFormValues> = group ? {
    name: group.name,
    description: group.description || '',
    isPrivate: group.isPrivate,
    maxMembers: group.maxMembers,
  } : {
    name: '',
    description: '',
    isPrivate: false,
    password: '',
    maxMembers: null,
  };

  const form = useForm<GroupSettingsFormValues>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues,
  });

  const { register, handleSubmit, watch, formState: { errors }, setValue } = form;
  const isPrivate = watch('isPrivate');

  const onSubmit = async (data: GroupSettingsFormValues) => {
    try {
      setIsLoading(true);

      // Prepare the update data
      const updateData = {
        ...data,
        // Only include password if it's provided
        ...(data.password ? { password: data.password } : {})
      };

      // Call the update API
      await updateGroup.mutateAsync({
        groupId,
        data: updateData
      });

      // Refresh the group data
      await refetch();

      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handleLeaveGroup = async () => {
    if (isLeaving || !onLeave) {
      return;
    }

    try {
      setIsLeaving(true);
      await onLeave();
      setIsLeaveDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
    }
  };
  
  const handleLeaveDialogOpenChange = (open: boolean) => {
    // Only allow closing if not in the middle of leaving
    if (!open && !isLeaving) {
      setIsLeaveDialogOpen(false);
    }
  };

  if (isLoadingGroup) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load group details</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>
            Update your group's name, description, and privacy settings.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="Enter group name"
                  {...register('name')}
                  disabled={isLoading || isLoadingGroup}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about this group"
                  className="min-h-[100px]"
                  {...register('description')}
                  disabled={isLoading || isLoadingGroup}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum Members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min={group.memberCount}
                  max={100}
                  placeholder="Leave empty for no limit"
                  {...register('maxMembers', {
                    valueAsNumber: true,
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Current members: {group.memberCount}
                  {group.maxMembers ? ` (Max: ${group.maxMembers})` : ''}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-private">Private Group</Label>
                    <p className="text-sm text-muted-foreground">
                      Only approved members can join
                    </p>
                  </div>
                  <Switch
                    id="is-private"
                    checked={isPrivate}
                    onCheckedChange={(checked) => setValue('isPrivate', checked)}
                    disabled={isLoading || isLoadingGroup}
                  />
                </div>

                {isPrivate && (
                  <div className="space-y-2 pl-1">
                    <Label htmlFor="password">Group Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter a new password (leave blank to keep current)"
                        {...register('password')}
                      />
                      <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Members will need this password to join the group.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t px-6 py-4">

            <Button type="submit" disabled={isLoading || isLoadingGroup}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            These actions are irreversible. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delete Group Button (only for admins) */}
          {(isAdmin || isCreator) && (
            <div className="flex flex-col space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-destructive">
                    Delete this group
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Once you delete a group, there is no going back. Please be certain.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        disabled={isLoading || isDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Group
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the group and all of its data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteGroup}
                          disabled={isDeleting}
                          className="flex items-center gap-2 min-w-[120px]"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span>Delete Group</span>
                            </>
                          )}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}

          {/* Leave Group Button (for all members) */}
          <div className="flex flex-col space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-amber-500">
                  Leave group
                </h4>
                <p className="text-sm text-muted-foreground">
                  No longer want to be part of this group?
                </p>
              </div>
              <Button
                variant="outline"
                className="border-amber-500 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
                onClick={() => setIsLeaveDialogOpen(true)}
                disabled={isLoading || isLeaving}
              >
                {isLeaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave Group
                  </>
                )}
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-600">
              <UserPlus className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium">Invite Members</h3>
            <p className="text-sm text-muted-foreground">
              Share this link with others to invite them to your group
            </p>
            <div className="flex items-center pt-4 gap-2">
              <InviteCard groupId={groupId} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-medium">Member Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Manage what members can do in this group.
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Manage Permissions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-medium">Admin Settings</h3>
            <p className="text-sm text-muted-foreground">
              Advanced settings for group administrators.
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Admin Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
