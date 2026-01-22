'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Trash2, Save, Loader2, AlertCircle, UserPlus, Users, LogOut, X, Plus, Tag, Settings, Bell, FileSpreadsheet } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
// import { useGroups } from '@/hooks/use-groups';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ExcelImportExport from '@/components/excel/excel-import-export';
import { useActiveGroup } from '@/contexts/group-context';

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

type GroupNotificationSettings = {
  groupMessages: boolean;
  announcements: boolean;
  mealUpdates: boolean;
  memberActivity: boolean;
  joinRequests: boolean;
};

import { GroupImageSelection } from '@/components/groups/group-image-selection';

const groupSettingsSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  bannerUrl: z.string().optional(),
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
  ]).optional(),
  tags: z.array(z.string()).default([]),
  features: z.record(z.string(), z.boolean()).default({}),
});

type GroupSettingsFormValues = z.input<typeof groupSettingsSchema>;

// Actions import removed

interface SettingsTabProps {
  groupId: string;
  group: any;
  isAdmin: boolean;
  isCreator: boolean;
  onUpdate: () => void;
}

// ... existing code ...

export function SettingsTab({
  groupId,
  group,
  onUpdate,
  isAdmin = false,
  isCreator = false,
}: SettingsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const router = useRouter();
  const { updateGroupData } = useActiveGroup();

  // const { deleteGroup, useGroupDetails, updateGroup, leaveGroup } = useGroups();
  // const { data: group, isLoading: isLoadingGroup, refetch } = useGroupDetails(groupId);
  const isLoadingGroup = false;
  const refetch = () => router.refresh();

  const [newTag, setNewTag] = useState('');
  const [tagError, setTagError] = useState('');
  const [deleteGroupName, setDeleteGroupName] = useState('');
  const [isDeleteNameValid, setIsDeleteNameValid] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<GroupNotificationSettings | null>({
    groupMessages: true,
    announcements: true,
    mealUpdates: true,
    memberActivity: true,
    joinRequests: true,
  });
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  // Store previous group values for comparison
  const prevGroupRef = useState<PreviousGroupSettings | null>(null);

  const form = useForm<GroupSettingsFormValues>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: {
      name: group?.name || '',
      description: group?.description || '',
      bannerUrl: group?.bannerUrl || '',
      isPrivate: group?.isPrivate || false,
      maxMembers: group?.maxMembers || undefined,
      tags: (group as any)?.tags || [],
      features: (group as any)?.features || {},
    },
  });

  const { register, handleSubmit, watch, formState: { errors, dirtyFields }, setValue } = form;
  const isPrivateForm = watch('isPrivate');
  const bannerUrl = watch('bannerUrl') || '';
  const formTags = watch('tags') || [];
  const formFeatures = watch('features') || {};

  // Store previous group values for comparison
  type PreviousGroupSettings = {
    name: string;
    description: string | null;
    bannerUrl: string | null;
    isPrivate: boolean;
    maxMembers: number | null | undefined;
    tags: string[];
    features: Record<string, boolean>;
  };

  // ... form setup ...

  // Update form values when group data changes
  useEffect(() => {
    if (group) {
      if (!dirtyFields.name) setValue('name', group.name);
      if (!dirtyFields.description) setValue('description', group.description || '');
      // Always update bannerUrl as it's handled separately or we want the latest
      if (!dirtyFields.bannerUrl) setValue('bannerUrl', group.bannerUrl || '');
      if (!dirtyFields.isPrivate) setValue('isPrivate', group.isPrivate);
      if (!dirtyFields.maxMembers) setValue('maxMembers', group.maxMembers || undefined);
      if (!dirtyFields.tags) setValue('tags', (group as any).tags || []);
      // Assuming features update individually via switches usually.
      setValue('features', (group as any).features || {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, setValue]);

  // ... notification logic ...

  const handleImageUpdate = async (url: string) => {
    try {
      // Optimistically update form
      setValue('bannerUrl', url, { shouldDirty: true });
      // Updates context immediately for Group Switcher and others
      updateGroupData(groupId, { bannerUrl: url });

      setIsLoading(true);
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bannerUrl: url }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update group photo');
      }

      router.refresh();
      onUpdate();
      toast.success('Group photo updated');
    } catch (error: any) {
      toast.error('Failed to update group photo');
      // Revert on failure?
      if (group?.bannerUrl) {
        setValue('bannerUrl', group.bannerUrl);
        // Revert context?
        updateGroupData(groupId, { bannerUrl: group.bannerUrl });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: GroupSettingsFormValues) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          bannerUrl: data.bannerUrl,
          isPrivate: data.isPrivate,
          maxMembers: typeof data.maxMembers === 'string'
            ? (data.maxMembers === '' ? undefined : Number(data.maxMembers))
            : (data.maxMembers === null ? undefined : data.maxMembers),
          tags: data.tags,
          features: data.features,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update group');
      }

      router.refresh(); // Server revalidate
      onUpdate();

      // ... toast logic ...
      toast.success('Group settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeatureToggle = async (featureId: string, checked: boolean) => {
    try {
      const newFeatures = { ...formFeatures, [featureId]: checked };
      setValue(`features.${featureId}`, checked);

      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features: newFeatures }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update feature');
      }

      router.refresh();
      onUpdate();
      toast.success(`${GROUP_FEATURES[featureId].name} ${checked ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      // Revert the switch if the update fails
      setValue(`features.${featureId}`, !checked);
      toast.error(`Failed to update feature. ${error.message}`);
    }
  };

  const handleLeaveGroup = async () => {
    if (isLeaving || !groupId) {
      return;
    }

    try {
      setIsLeaving(true);
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to leave group');
      }

      setIsLeaveDialogOpen(false);
      toast.success('You have left the group');
      router.push('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group. Please try again.');
    } finally {
      setIsLeaving(false);
    }
  };

  // ... leave dialog handlers ...

  const handleDeleteGroup = async () => {
    if (!groupId || !isDeleteNameValid || isDeleting) return;
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete group');
      }

      setIsDeleteDialogOpen(false); // Only close after success
      toast.success('Group deleted');
      router.push('/groups');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete group');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    if (formTags.includes(tag)) {
      setTagError('Tag already exists');
      return;
    }
    if (formTags.length >= 10) {
      setTagError('Maximum 10 tags allowed');
      return;
    }
    setValue('tags', [...formTags, tag], { shouldDirty: true });
    setNewTag('');
    setTagError('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', formTags.filter(t => t !== tagToRemove), { shouldDirty: true });
  };

  const handleNotificationToggle = (key: keyof GroupNotificationSettings) => {
    if (!notificationSettings) return;
    setNotificationSettings(prev => prev ? {
      ...prev,
      [key]: !prev[key]
    } : null);
    toast.success('Notification settings updated');
  };

  const handleLeaveDialogOpenChange = (open: boolean) => {
    // Only allow closing if not in the middle of leaving
    if (!open && !isLeaving) {
      setIsLeaveDialogOpen(false);
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
              <GroupImageSelection
                selectedImage={bannerUrl}
                onSelect={handleImageUpdate}
              />
            </div>

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
                className="max-h-32"
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
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Data Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Import and export group data
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
              <ExcelImportExport />
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage what notifications you receive from this group
              </p>
            </div>

            {isLoadingNotifications ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : notificationSettings ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="groupMessages">Group Messages</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when members send messages
                    </p>
                  </div>
                  <Switch
                    id="groupMessages"
                    checked={notificationSettings.groupMessages}
                    onCheckedChange={() => handleNotificationToggle('groupMessages')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="announcements">Announcements</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified about admin announcements
                    </p>
                  </div>
                  <Switch
                    id="announcements"
                    checked={notificationSettings.announcements}
                    onCheckedChange={() => handleNotificationToggle('announcements')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="mealUpdates">Meal Updates</Label>
                    <p className="text-xs text-muted-foreground">
                      Updates about meal planning
                    </p>
                  </div>
                  <Switch
                    id="mealUpdates"
                    checked={notificationSettings.mealUpdates}
                    onCheckedChange={() => handleNotificationToggle('mealUpdates')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="memberActivity">Member Activity</Label>
                    <p className="text-xs text-muted-foreground">
                      When members join or leave
                    </p>
                  </div>
                  <Switch
                    id="memberActivity"
                    checked={notificationSettings.memberActivity}
                    onCheckedChange={() => handleNotificationToggle('memberActivity')}
                  />
                </div>

                {(isAdmin || isCreator) && (
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="joinRequests">Join Requests</Label>
                      <p className="text-xs text-muted-foreground">
                        When users request to join
                      </p>
                    </div>
                    <Switch
                      id="joinRequests"
                      checked={notificationSettings.joinRequests}
                      onCheckedChange={() => handleNotificationToggle('joinRequests')}
                    />
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <AlertDescription>Failed to load notification settings</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                These actions are irreversible and will permanently affect your group. Please proceed with caution.
              </p>
            </div>

            <div className="space-y-4">
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
                  onClick={() => {
                    if (isCreator) {
                      toast.error('You must transfer the Admin role to another member before leaving the group.');
                      return;
                    }
                    setIsLeaveDialogOpen(true);
                  }}
                  disabled={isLeaving}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave
                </Button>
              </div>

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

          <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Group</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the group and all associated data including.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All group messages and announcements</li>
                  <li>Member roles and permissions</li>
                  <li>Activity logs and history</li>
                  <li>Meal plans and shopping lists</li>
                  <li>Payment records and transactions</li>
                </ul>
                <span className="font-medium block pt-4">
                  To confirm, please type <span className="font-bold text-destructive">{group?.name}</span>:
                </span>
                <Input
                  placeholder="Enter group name"
                  value={deleteGroupName}
                  onChange={(e) => {
                    setDeleteGroupName(e.target.value);
                    setIsDeleteNameValid(e.target.value === group?.name);
                  }}
                  className={`${isDeleteNameValid
                    ? "border-green-500 focus-visible:ring-green-500"
                    : deleteGroupName
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                    }`}
                  disabled={isDeleting}
                />
                {deleteGroupName && !isDeleteNameValid && (
                  <span className="text-sm text-destructive block">
                    The name doesn't match the group name
                  </span>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isDeleting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
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
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isLeaveDialogOpen} onOpenChange={handleLeaveDialogOpenChange}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave Group</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="text-sm text-muted-foreground">
                    <p>Are you sure you want to leave this group?</p>
                    <div className="bg-muted/50 p-3 rounded-md my-3">
                      <span className="text-sm font-medium block mb-2">This action will:</span>
                      <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Remove you from all group activities</li>
                        <li>Revoke your access to group content</li>
                        <li>Cancel any pending meal registrations</li>
                        <li>Remove you from group notifications</li>
                      </ul>
                    </div>
                    <p>
                      You won't be able to access this group again unless you're re-invited.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isLeaving}
                >
                  Cancel
                </AlertDialogCancel>
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

        </form>
      </CardContent>
    </Card >
  );
} 