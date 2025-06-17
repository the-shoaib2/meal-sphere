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
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>

              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
                      <Skeleton className="h-4 w-4" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">General Settings</CardTitle>
            <CardDescription>Manage your group's basic settings and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      disabled={!isAdmin}
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
                      disabled={!isAdmin}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxMembers">Maximum Members</Label>
                    <Input
                      type="number"
                      id="maxMembers"
                      min={2}
                      max={100}
                      placeholder="Leave empty for no limit"
                      {...register('maxMembers', {
                        setValueAs: (v) => v === '' ? null : Number(v)
                      })}
                      disabled={!isAdmin}
                    />
                    <p className="text-sm text-muted-foreground">
                      Set a limit on the number of members who can join this group.
                    </p>
                    {errors.maxMembers && (
                      <p className="text-sm text-destructive">{errors.maxMembers.message}</p>
                    )}
      </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="private">Private Group</Label>
                      <p className="text-sm text-muted-foreground">
                        {isPrivateForm 
                          ? 'New members will need admin approval to join this group.'
                          : 'Anyone with the link can join this group.'}
                      </p>
                    </div>
                    <Switch
                      id="private"
                      checked={isPrivateForm}
                      onCheckedChange={(checked) => setValue('isPrivate', checked)}
                      disabled={!isAdmin}
        />
      </div>
    </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Group Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formTags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Input
                        id="newTag"
                        value={newTag}
                        onChange={(e) => {
                          setNewTag(e.target.value);
                          setTagError('');
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Add a tag"
                        disabled={formTags.length >= 5}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleAddTag}
                        disabled={formTags.length >= 5}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {tagError && (
                    <p className="text-sm text-destructive">{tagError}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Add up to 5 tags to help others find your group
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
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
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Group Features</CardTitle>
              <CardDescription>Enable or disable group features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Membership Features */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Membership</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(GROUP_FEATURES)
                      .filter(([_, feature]) => feature.category === 'membership')
                      .map(([key, feature]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor={feature.id} className="text-sm">{feature.name}</Label>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                          <Switch
                            id={feature.id}
                            checked={formFeatures[feature.id] ?? feature.defaultValue}
                            disabled={!isAdmin || (feature.requiresAdmin && !isAdmin)}
                            onCheckedChange={async (checked) => {
                              setValue('features', {
                                ...formFeatures,
                                [feature.id]: checked
                              });
                              try {
                                await updateGroup.mutateAsync({
                                  groupId,
                                  data: {
                                    features: {
                                      ...formFeatures,
                                      [feature.id]: checked
                                    }
                                  }
                                });
                                toast({
                                  title: 'Success',
                                  description: `${feature.name} ${checked ? 'enabled' : 'disabled'}`,
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update feature',
                                  variant: 'destructive',
                                });
                                setValue('features', {
                                  ...formFeatures,
                                  [feature.id]: !checked
                                });
                              }
                            }}
                          />
                        </div>
                    ))}
                  </div>
                </div>

                {/* Communication Features */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Communication</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(GROUP_FEATURES)
                      .filter(([_, feature]) => feature.category === 'communication')
                      .map(([key, feature]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor={feature.id} className="text-sm">{feature.name}</Label>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                          <Switch
                            id={feature.id}
                            checked={formFeatures[feature.id] ?? feature.defaultValue}
                            disabled={!isAdmin || (feature.requiresAdmin && !isAdmin)}
                            onCheckedChange={async (checked) => {
                              setValue('features', {
                                ...formFeatures,
                                [feature.id]: checked
                              });
                              try {
                                await updateGroup.mutateAsync({
                                  groupId,
                                  data: {
                                    features: {
                                      ...formFeatures,
                                      [feature.id]: checked
                                    }
                                  }
                                });
                                toast({
                                  title: 'Success',
                                  description: `${feature.name} ${checked ? 'enabled' : 'disabled'}`,
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update feature',
                                  variant: 'destructive',
                                });
                                setValue('features', {
                                  ...formFeatures,
                                  [feature.id]: !checked
                                });
                              }
                            }}
                          />
                        </div>
                    ))}
                  </div>
                </div>

                {/* Meal Features */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Meals & Shopping</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(GROUP_FEATURES)
                      .filter(([_, feature]) => feature.category === 'meals')
                      .map(([key, feature]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor={feature.id} className="text-sm">{feature.name}</Label>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                          <Switch
                            id={feature.id}
                            checked={formFeatures[feature.id] ?? feature.defaultValue}
                            disabled={!isAdmin || (feature.requiresAdmin && !isAdmin)}
                            onCheckedChange={async (checked) => {
                              setValue('features', {
                                ...formFeatures,
                                [feature.id]: checked
                              });
                              try {
                                await updateGroup.mutateAsync({
                                  groupId,
                                  data: {
                                    features: {
                                      ...formFeatures,
                                      [feature.id]: checked
                                    }
                                  }
                                });
                                toast({
                                  title: 'Success',
                                  description: `${feature.name} ${checked ? 'enabled' : 'disabled'}`,
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update feature',
                                  variant: 'destructive',
                                });
                                setValue('features', {
                                  ...formFeatures,
                                  [feature.id]: !checked
                                });
                              }
                            }}
                          />
                        </div>
                    ))}
                  </div>
                </div>

                {/* Management Features */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Management</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(GROUP_FEATURES)
                      .filter(([_, feature]) => feature.category === 'management')
                      .map(([key, feature]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-0.5">
                            <Label htmlFor={feature.id} className="text-sm">{feature.name}</Label>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                          <Switch
                            id={feature.id}
                            checked={formFeatures[feature.id] ?? feature.defaultValue}
                            disabled={!isAdmin || (feature.requiresAdmin && !isAdmin)}
                            onCheckedChange={async (checked) => {
                              setValue('features', {
                                ...formFeatures,
                                [feature.id]: checked
                              });
                              try {
                                await updateGroup.mutateAsync({
                                  groupId,
                                  data: {
                                    features: {
                                      ...formFeatures,
                                      [feature.id]: checked
                                    }
                                  }
                                });
                                toast({
                                  title: 'Success',
                                  description: `${feature.name} ${checked ? 'enabled' : 'disabled'}`,
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update feature',
                                  variant: 'destructive',
                                });
                                setValue('features', {
                                  ...formFeatures,
                                  [feature.id]: !checked
                                });
                              }
                            }}
                          />
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible. Proceed with caution.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {(isAdmin || isCreator) && (
                <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                  <div>
                    <h4 className="font-medium text-destructive">Delete Group</h4>
                    <p className="text-sm text-muted-foreground">
                      Once you delete a group, there is no going back.
                    </p>
                  </div>
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
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
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Group
                            </>
                          )}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {!isCreator && (
                <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <div>
                    <h4 className="font-medium text-amber-500">Leave Group</h4>
                    <p className="text-sm text-muted-foreground">
                      You won't be able to access this group again unless you're re-invited.
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You won't be able to access it again unless you're re-invited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleLeaveGroup}
              disabled={isLeaving}
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 