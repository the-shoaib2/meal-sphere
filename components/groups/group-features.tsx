import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { GROUP_FEATURES, GROUP_CATEGORIES, GROUP_TAGS, type GroupCategory, type GroupTag } from '@/lib/features';

interface GroupFeaturesProps {
  groupId: string;
  isAdmin: boolean;
}

export function GroupFeatures({ groupId, isAdmin }: GroupFeaturesProps) {
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<GroupTag[]>([]);

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) throw new Error('Failed to fetch group');
      return response.json();
    }
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: async (features: Record<string, boolean>) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features })
      });
      if (!response.ok) throw new Error('Failed to update features');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Group features updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update features');
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (category: GroupCategory) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Group category updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    }
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: GroupTag[]) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });
      if (!response.ok) throw new Error('Failed to update tags');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Group tags updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update tags');
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const features = group.features || {};
  const category = group.category as GroupCategory;
  const tags = group.tags as GroupTag[] || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Features
          </CardTitle>
          <CardDescription>
            Manage group features and functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(GROUP_FEATURES).map(([key, feature]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={feature.id}>{feature.name}</Label>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                id={feature.id}
                checked={features[feature.id] ?? feature.defaultValue}
                disabled={!isAdmin || (feature.requiresAdmin && !isAdmin)}
                onCheckedChange={(checked) => {
                  updateFeaturesMutation.mutate({
                    ...features,
                    [feature.id]: checked
                  });
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Group Category</CardTitle>
          <CardDescription>
            Select a category that best describes your group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={category}
            onValueChange={(value) => updateCategoryMutation.mutate(value as GroupCategory)}
            disabled={!isAdmin}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {GROUP_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Group Tags</CardTitle>
          <CardDescription>
            Add tags to help others find your group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => {
                        updateTagsMutation.mutate(tags.filter((t) => t !== tag));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
            {isAdmin && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (!tags.includes(value as GroupTag)) {
                    updateTagsMutation.mutate([...tags, value as GroupTag]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add a tag" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 