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
import { Trash2, Save, Lock, ShieldAlert, Loader2, Check, AlertCircle, UserPlus, Users, LogOut, X, Plus, Tag, Settings } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useGroups } from '@/hooks/use-groups';
import { InviteCard } from '../invite-card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationSettings } from './notification-settings';

type FeatureCategory = 'membership' | 'communication' | 'meals' | 'management';

interface GroupFeature {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
  requiresAdmin: boolean;
  category: FeatureCategory;
}

const GROUP_FEATURES: Record<string, GroupFeature> = {
  joinRequests: {
    id: 'joinRequests',
    name: 'Join Requests',
    description: 'Require approval for new members to join',
    defaultValue: true,
    requiresAdmin: true,
    category: 'membership'
  },
  groupMessages: {
    id: 'groupMessages',
    name: 'Group Messages',
    description: 'Enable group chat functionality',
    defaultValue: true,
    requiresAdmin: true,
    category: 'communication'
  },
  announcements: {
    id: 'announcements',
    name: 'Announcements',
    description: 'Allow admins to post announcements',
    defaultValue: true,
    requiresAdmin: true,
    category: 'communication'
  },
  memberRoles: {
    id: 'memberRoles',
    name: 'Member Roles',
    description: 'Enable custom member roles and permissions',
    defaultValue: true,
    requiresAdmin: true,
    category: 'membership'
  },
  activityLog: {
    id: 'activityLog',
    name: 'Activity Log',
    description: 'Track and display group activities',
    defaultValue: true,
    requiresAdmin: true,
    category: 'management'
  },
  shoppingList: {
    id: 'shoppingList',
    name: 'Shopping List',
    description: 'Enable group shopping list functionality',
    defaultValue: true,
    requiresAdmin: true,
    category: 'meals'
  },
  mealPlanning: {
    id: 'mealPlanning',
    name: 'Meal Planning',
    description: 'Enable meal planning and tracking',
    defaultValue: true,
    requiresAdmin: true,
    category: 'meals'
  },
  payments: {
    id: 'payments',
    name: 'Payments',
    description: 'Enable payment tracking and management',
    defaultValue: true,
    requiresAdmin: true,
    category: 'meals'
  }
};

const groupSettingsSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  isPrivate: z.boolean(),
  maxMembers: z.union([
    z.string()
      .transform(val => val === '' ? null : Number(val))
      .refine(val => val === null || val >= 2, {
        message: 'Must have at least 2 members',
      })
      .refine(val => val === null || val <= 100, {
        message: 'Maximum 100 members allowed',
      })
      .refine(val => val === null || Number.isInteger(val), {
        message: 'Must be a whole number',
      }),
    z.number()
      .int('Must be a whole number')
      .min(2, 'Must have at least 2 members')
      .max(100, 'Maximum 100 members allowed')
      .nullable()
  ]).optional().transform(val => val === undefined ? null : val),
  tags: z.array(z.string()).default([]),
  features: z.record(z.boolean()).default({}),
});

type GroupSettingsFormValues = {
  name: string;
  description: string;
  isPrivate: boolean;
  maxMembers?: number;
  tags: string[];
  features: Record<string, boolean>;
};

interface SettingsTabProps {
  groupId: string;
  isAdmin: boolean;
  isCreator: boolean;
  onUpdate: () => void;
  onLeave?: () => Promise<void>;
}

type GroupWithExtras = {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  maxMembers: number | null;
  tags: string[];
  features: Record<string, boolean>;
  category?: string;
};

export function SettingsTab({
  groupId,
  onUpdate,
  onLeave,
  isAdmin = false,
  isCreator = false,
}: SettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { deleteGroup, useGroupDetails, updateGroup } = useGroups();
  const { data: group, isLoading: isLoadingGroup, refetch } = useGroupDetails(groupId);
  const { toast } = useToast();
  const [newTag, setNewTag] = useState('');
  const [tagError, setTagError] = useState('');
  const [deleteGroupName, setDeleteGroupName] = useState('');
  const [isDeleteNameValid, setIsDeleteNameValid] = useState(false);

  const form = useForm<GroupSettingsFormValues>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: {
      name: group?.name || '',
      description: group?.description || '',
      isPrivate: group?.isPrivate || false,
      maxMembers: group?.maxMembers || undefined,
      tags: (group as GroupWithExtras)?.tags || [],
      features: (group as GroupWithExtras)?.features || {},
    },
  });

  const { register, handleSubmit, watch, formState: { errors }, setValue } = form;
  const isPrivateForm = watch('isPrivate');
  const formTags = watch('tags') || [];
  const formFeatures = watch('features') || {};

  // Update form values when group data changes
  useEffect(() => {
    if (group) {
      setValue('name', group.name);
      setValue('description', group.description || '');
      setValue('isPrivate', group.isPrivate);
      setValue('maxMembers', group.maxMembers || undefined);
      setValue('tags', (group as GroupWithExtras).tags || []);
      setValue('features', (group as GroupWithExtras).features || {});
    }
  }, [group, setValue]);

  useEffect(() => {
    setIsDeleteNameValid(deleteGroupName === group?.name);
  }, [deleteGroupName, group?.name]);

  const handleAddTag = () => {
    if (!newTag.trim()) {
      setTagError('Tag cannot be empty');
      return;
    }

    if (formTags.includes(newTag.trim())) {
      setTagError('Tag already exists');
      return;
    }

    if (formTags.length >= 5) {
      setTagError('Maximum 5 tags allowed');
      return;
    }

    setValue('tags', [...formTags, newTag.trim()]);
    setNewTag('');
    setTagError('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', formTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const onSubmit = async (data: GroupSettingsFormValues) => {
    try {
      setIsLoading(true);

      // Call the update API
      await updateGroup.mutateAsync({
        groupId,
        data: {
          name: data.name,
          description: data.description,
          isPrivate: data.isPrivate,
          maxMembers: data.maxMembers,
          tags: data.tags,
          features: data.features,
        }
      });

      // Refresh the group data
      await refetch();

      onUpdate();
      toast({
        title: 'Success',
        description: 'Group settings updated successfully',
      });
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

  const handleFeatureToggle = async (featureId: string, checked: boolean) => {
    try {
      const newFeatures = { ...formFeatures, [featureId]: checked };
      setValue(`features.${featureId}`, checked);
      
      await updateGroup.mutateAsync({
        groupId,
        data: {
          features: newFeatures,
        }
      });

      await refetch();
      onUpdate();
      toast({
        title: 'Success',
        description: `${GROUP_FEATURES[featureId].name} ${checked ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      // Revert the switch if the update fails
      setValue(`features.${featureId}`, !checked);
      toast({
        title: 'Error',
        description: 'Failed to update feature. Please try again.',
        variant: 'destructive',
      });
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

  const handleDeleteGroup = async () => {
    if (!groupId || !isDeleteNameValid) return;

    try {
      setIsDeleting(true);
      await deleteGroup.mutateAsync(groupId);
      // Dialog will be closed by the mutation's onSuccess handler
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteGroupName('');
      setIsDeleteNameValid(false);
    }
    setIsDeleteDialogOpen(open);
  };

  if (isLoadingGroup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Settings</CardTitle>
          <CardDescription>Manage your group's settings and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
      </div>
        </CardContent>
      </Card>
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

  type GroupWithExtras = typeof group & {
    features?: Record<string, boolean>;
    category?: string;
    tags?: string[];
  };
  const groupWithExtras = group as GroupWithExtras;
  const category = groupWithExtras.category ?? '';
  const tags: string[] = groupWithExtras.tags ?? [];

  if (isLoading) {
    return (
      <Card >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Group Settings</CardTitle>
          <CardDescription>Manage your group's settings and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Settings Section Skeleton */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          </div>

          {/* Group Features Section Skeleton */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-4">
              {/* Membership Features Skeleton */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication Features Skeleton */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Meal Features Skeleton */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Management Features Skeleton */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[1].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone Section Skeleton */}
          <div className="space-y-4 border-t pt-6">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Group Settings</CardTitle>
        <CardDescription>Manage your group settings and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter group name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Enter group description"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum Members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  {...register('maxMembers')}
                  placeholder="Enter maximum number of members"
                />
                {errors.maxMembers && (
                  <p className="text-sm text-destructive">{errors.maxMembers.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag"
                  />
                  <Button type="button" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tagError && (
                  <p className="text-sm text-destructive">{tagError}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {formTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <Label>Features</Label>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="isPrivate">Private Group</Label>
                    <p className="text-sm text-muted-foreground">
                      Private groups require approval for new members to join
                    </p>
                  </div>
                  <Switch
                    id="isPrivate"
                    checked={isPrivateForm}
                    onCheckedChange={(checked) => {
                      setValue('isPrivate', checked);
                      handleSubmit(onSubmit)();
                    }}
                  />
                </div>

                {Object.entries(GROUP_FEATURES).map(([key, feature]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor={key}>{feature.name}</Label>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <Switch
                      id={key}
                      checked={formFeatures[key] ?? feature.defaultValue}
                      onCheckedChange={(checked) => handleFeatureToggle(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Add Notification Settings section */}
            <NotificationSettings groupId={groupId} isAdmin={isAdmin} />

            <div className="space-y-4 border-t pt-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">
                  These actions are irreversible and will permanently affect your group. Please proceed with caution.
                </p>
              </div>

              <div className="space-y-4">
                {!isCreator && onLeave && (
                  <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-destructive">Leave Group</h4>
                      <p className="text-sm text-muted-foreground">
                        You will no longer be a member of this group. You will lose access to all group content and will need to be invited back to rejoin.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setIsLeaveDialogOpen(true)}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                  </div>
                )}

                {isCreator && (
                  <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium text-destructive">Delete Group</h4>
                      <p className="text-sm text-muted-foreground">
                        This will permanently delete the group and all associated data. This action cannot be undone. All members will lose access to the group and its content.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-4">
                      <div>
                        This action cannot be undone. This will permanently delete the group
                        and all associated data including:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>All group messages and announcements</li>
                        <li>Member roles and permissions</li>
                        <li>Activity logs and history</li>
                        <li>Meal plans and shopping lists</li>
                        <li>Payment records and transactions</li>
                      </ul>
                      <div className="space-y-2 pt-4">
                        <div className="font-medium">
                          To confirm, please type <span className="font-bold text-destructive">{group?.name}</span>:
                        </div>
                        <Input
                          placeholder="Enter group name"
                          value={deleteGroupName}
                          onChange={(e) => setDeleteGroupName(e.target.value)}
                          className={`${
                            isDeleteNameValid 
                              ? "border-green-500 focus-visible:ring-green-500" 
                              : deleteGroupName 
                                ? "border-destructive focus-visible:ring-destructive" 
                                : ""
                          }`}
                          disabled={isDeleting}
                        />
                        {deleteGroupName && !isDeleteNameValid && (
                          <p className="text-sm text-destructive">
                            The name doesn't match the group name
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    disabled={isDeleting}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteGroup}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting || !isDeleteNameValid}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Group
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isLeaveDialogOpen} onOpenChange={handleLeaveDialogOpenChange}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this group? You will need to be invited back to rejoin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveGroup}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isLeaving}
                  >
                    {isLeaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Group
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>


        </form>
      </CardContent>
    </Card>
  );
} 