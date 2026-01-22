'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
// import { useGroups } from '@/hooks/use-groups';
import { toast } from 'sonner';
import { Loader2, Lock, ArrowLeft, Users, LockKeyhole, Hash, Info, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { GroupImageSelection } from '@/components/groups/group-image-selection';

const createGroupSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  bannerUrl: z.string().optional(),
  isPrivate: z.boolean().default(false),
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
});

type CreateGroupInput = z.infer<typeof createGroupSchema>;

// Actions import removed

export default function CreateGroupPage() {
  const router = useRouter();


  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema) as any,
    defaultValues: {
      isPrivate: false,
      maxMembers: null,
      bannerUrl: "/images/9099ffd8-d09b-4883-bac1-04be1274bb82.png", // Default image
    },
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty, isValid },
    setValue,
  } = form;

  const isPrivate = watch('isPrivate');
  const description = watch('description');
  const bannerUrl = watch('bannerUrl') || "/images/9099ffd8-d09b-4883-bac1-04be1274bb82.png";

  const onSubmit = async (data: CreateGroupInput) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          maxMembers: data.maxMembers || undefined,
          bannerUrl: data.bannerUrl,
        }),
      });

      if (response.ok) {
        toast.success('Group created successfully!');
        router.refresh();
        router.push('/groups');
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to create group');
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handlePrivacyChange = (isPrivate: boolean) => {
    setValue('isPrivate', isPrivate);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 pl-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Groups
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Create a New Group</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Set up your group with a name, description, and privacy settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <div className="relative">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="My Awesome Group"
                      {...register('name')}
                      error={errors.name?.message as string | undefined}
                      className="pl-10"
                    />
                    <Users className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell members what this group is about"
                  className="min-h-[100px]"
                  {...register('description')}
                />
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    What makes this group special? Let members know what to expect.
                  </p>
                  <span className={`text-xs ${(description?.length || 0) > 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {description?.length || 0}/500
                  </span>
                </div>
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <GroupImageSelection
                  selectedImage={bannerUrl}
                  onSelect={(url) => setValue('bannerUrl', url, { shouldDirty: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum Members (Optional)</Label>
                <div className="relative">
                  <div className="relative">
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      placeholder="Leave empty for no limit"
                      {...register('maxMembers', {
                        setValueAs: (v) => v === '' ? null : Number(v)
                      })}
                      error={errors.maxMembers?.message as string | undefined}
                      className="pl-10"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <Hash className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set a limit on the number of members who can join this group.
                </p>
                {errors.maxMembers && (
                  <p className="text-sm text-destructive">
                    {errors.maxMembers.message}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="isPrivate" className="font-medium">
                        Private Group
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isPrivate
                        ? 'New members will need admin approval to join this group.'
                        : 'Anyone with the link can join this group.'}
                    </p>
                  </div>
                  <Switch
                    id="isPrivate"
                    checked={isPrivate}
                    onCheckedChange={handlePrivacyChange}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isDirty || !isValid || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 p-6 bg-muted/20 rounded-lg border border-muted">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg mb-2">Group Creation Tips</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    <span className="font-medium">Choose a clear name</span> - Make it easy for others to
                    understand what your group is about.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    <span className="font-medium">Set privacy carefully</span> - Public groups are
                    discoverable by anyone, while private groups require a password to join.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    <span className="font-medium">Member limits</span> - Consider setting a reasonable
                    limit based on your group's purpose.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
