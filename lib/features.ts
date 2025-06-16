export type FeatureFlag = {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
  requiresAdmin?: boolean;
};

export const GROUP_FEATURES: Record<string, FeatureFlag> = {
  JOIN_REQUESTS: {
    id: 'join_requests',
    name: 'Join Requests',
    description: 'Require approval for new members to join',
    defaultValue: false,
    requiresAdmin: true
  },
  MESSAGES: {
    id: 'messages',
    name: 'Group Messages',
    description: 'Enable group chat functionality',
    defaultValue: true
  },
  ANNOUNCEMENTS: {
    id: 'announcements',
    name: 'Announcements',
    description: 'Allow admins to post announcements',
    defaultValue: true,
    requiresAdmin: true
  },
  MEMBER_ROLES: {
    id: 'member_roles',
    name: 'Member Roles',
    description: 'Enable custom member roles and permissions',
    defaultValue: false,
    requiresAdmin: true
  },
  ACTIVITY_LOG: {
    id: 'activity_log',
    name: 'Activity Log',
    description: 'Track and display group activities',
    defaultValue: true,
    requiresAdmin: true
  },
  SHOPPING: {
    id: 'shopping',
    name: 'Shopping List',
    description: 'Enable group shopping list functionality',
    defaultValue: true
  },
  MEALS: {
    id: 'meals',
    name: 'Meal Planning',
    description: 'Enable meal planning and tracking',
    defaultValue: true
  },
  PAYMENTS: {
    id: 'payments',
    name: 'Payments',
    description: 'Enable payment tracking and management',
    defaultValue: true
  }
};

export const GROUP_CATEGORIES = [
  'Food & Cooking',
  'Study',
  'Work',
  'Social',
  'Hobby',
  'Sports',
  'Travel',
  'Other'
] as const;

export type GroupCategory = typeof GROUP_CATEGORIES[number];

export const GROUP_TAGS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Halal',
  'Kosher',
  'Budget',
  'Premium',
  'Family',
  'Students',
  'Professionals',
  'Local',
  'International'
] as const;

export type GroupTag = typeof GROUP_TAGS[number];

export function getDefaultFeatures(): Record<string, boolean> {
  return Object.values(GROUP_FEATURES).reduce((acc, feature) => ({
    ...acc,
    [feature.id]: feature.defaultValue
  }), {});
}

export function validateFeatures(features: Record<string, boolean>): boolean {
  return Object.keys(features).every(key => key in GROUP_FEATURES);
}

export function getEnabledFeatures(features: Record<string, boolean>): string[] {
  return Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([id]) => id);
}

export function isFeatureEnabled(
  features: Record<string, boolean>,
  featureId: string,
  isAdmin: boolean = false
): boolean {
  const feature = GROUP_FEATURES[featureId];
  if (!feature) return false;
  if (feature.requiresAdmin && !isAdmin) return false;
  return features[featureId] ?? feature.defaultValue;
} 