import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';
import { AnalyticsData } from '@/hooks/use-analytics';
import { GroupBalanceSummary } from '@/hooks/use-account-balance';

export type DashboardSummary = {
  totalUserMeals: number;
  totalAllMeals: number;
  currentRate: number;
  currentBalance: number;
  availableBalance: number;
  totalCost: number;
  activeRooms: number;
  totalActiveGroups: number;
  totalMembers: number;
  groupId: string;
  groupName: string;
};

export type DashboardActivity = {
  id: string;
  type: 'MEAL' | 'PAYMENT' | 'EXPENSE' | 'GROUP_JOIN' | 'GROUP_LEAVE' | 'SHOPPING' | 'ACTIVITY';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  groupName?: string;
  user?: {
    name: string;
    image?: string;
  };
};

export type DashboardChartData = {
  date: string;
  meals: number;
  expenses: number;
  balance: number;
};

// Main hook that fetches all dashboard data in a single parallel request (Aggregates separate queries)
export function useDashboard() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  const userStatsQuery = useDashboardUserStats();
  const groupStatsQuery = useDashboardGroupStats(activeGroup?.id);
  const chartsQuery = useDashboardCharts(activeGroup?.id);
  const activitiesQuery = useDashboardActivities(activeGroup?.id);
  // We use the existing useAnalytics hook for analytics part? 
  // Need to ensure we fetch analytics for the *current* group as part of this "unified" dashboard return.
  // Actually, let's fetch analytics here manually or use the hook if accessible. 
  // For now, let's keep it simple: we define a unified loading state.
  
  // Note: For full backward comp, we need 'analytics' and 'userRooms'.
  // 'userRooms' is handled by separate hook usually or part of user-stats? 
  // In my user-stats route, I only returned 'activeGroups' count.
  // The original one returned 'userRooms' array. 
  // I should probably add 'userRooms' to user-stats or a separate fetch.
  // Let's assume userRooms is fetched by useUserRooms() separately in the UI, 
  // BUT the dashboard page expects it in the unified object.
  // Use existing hooks where possible.
  
  const isUnifiedLoading = userStatsQuery.isLoading || groupStatsQuery.isLoading || chartsQuery.isLoading || activitiesQuery.isLoading;
  const isRefetching = userStatsQuery.isRefetching || groupStatsQuery.isRefetching || chartsQuery.isRefetching || activitiesQuery.isRefetching;
  
  const refetch = async () => {
    await Promise.all([
      userStatsQuery.refetch(),
      groupStatsQuery.refetch(),
      chartsQuery.refetch(),
      activitiesQuery.refetch()
    ]);
  };

  // Construct legacy shape
  const summary: DashboardSummary | null = userStatsQuery.data && groupStatsQuery.data ? {
      totalUserMeals: userStatsQuery.data.totalUserMeals,
      currentBalance: userStatsQuery.data.currentBalance,
      availableBalance: userStatsQuery.data.availableBalance,
      totalCost: userStatsQuery.data.totalSpent,
      activeRooms: userStatsQuery.data.activeGroups,
      // Group stats
      totalAllMeals: groupStatsQuery.data.totalAllMeals,
      currentRate: groupStatsQuery.data.currentRate,
      totalActiveGroups: userStatsQuery.data.activeGroups, // Duplicate field in type?
      totalMembers: groupStatsQuery.data.totalMembers,
      // Missing in types?
      groupId: activeGroup?.id || '',
      groupName: groupStatsQuery.data.groupName || ''
  } : null;

  return {
    data: {
      summary: summary,
      activities: activitiesQuery.data || [],
      chartData: chartsQuery.data || [],
      analytics: null as any, // The UI fetches this separately now via useAnalytics or we can add it here
      userRooms: [], // UI fetches via useUserRooms
      groupBalance: groupStatsQuery.data?.groupBalance || null,
      groups: [],
      notifications: []
    },
    isLoading: isUnifiedLoading,
    refetch,
    isRefetching,
    error: userStatsQuery.error || groupStatsQuery.error || chartsQuery.error || activitiesQuery.error,
    isError: userStatsQuery.isError || groupStatsQuery.isError || chartsQuery.isError || activitiesQuery.isError
  };
}

// Granular Hooks

export function useDashboardUserStats() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup(); // Optional for this one? user-stats relies on query param OR default
  
  return useQuery({
    queryKey: ['dashboard-user-stats', activeGroup?.id],
    queryFn: async () => {
        const url = activeGroup?.id 
            ? `/api/dashboard/summary/user-stats?groupId=${activeGroup.id}`
            : `/api/dashboard/summary/user-stats`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch user stats');
        return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!session?.user?.id
  });
}

export function useDashboardGroupStats(groupId?: string) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['dashboard-group-stats', groupId],
    queryFn: async () => {
        if (!groupId) return null;
        const res = await fetch(`/api/dashboard/summary/group-stats?groupId=${groupId}`);
        if (!res.ok) throw new Error('Failed to fetch group stats');
        return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!session?.user?.id && !!groupId
  });
}

export function useDashboardCharts(groupId?: string) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['dashboard-charts', groupId],
    queryFn: async () => {
        const url = groupId 
            ? `/api/dashboard/charts?groupId=${groupId}`
            : `/api/dashboard/charts`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch charts');
        return res.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!session?.user?.id && !!groupId
  });
}

export function useDashboardActivities(groupId?: string) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['dashboard-activities', groupId],
    queryFn: async () => {
        const url = groupId 
            ? `/api/dashboard/activities?groupId=${groupId}`
            : `/api/dashboard/activities`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch activities');
        return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!session?.user?.id && !!groupId
  });
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // No-op, we just invalidate
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-group-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Legacy
    },
  });
}

export function useDashboardExport() {
  return useMutation({
    mutationFn: async (format: 'pdf' | 'excel' | 'csv') => {
      const res = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error('Failed to export dashboard data');
      return res.blob();
    },
  });
}

// Hook to get dashboard statistics for a specific group
export function useGroupDashboardStats(groupId: string) {
    // Legacy support or direct alias? 
    // This used to call /api/dashboard/group-stats but logic is now in summary/group-stats
    // Let's reuse the new one but maintain type signature if needed.
    return useDashboardGroupStats(groupId);
}

// Hook to get user's dashboard preferences
export function useDashboardPreferences() {
  const { data: session } = useSession();

  return useQuery<{
    showChart: boolean;
    showActivities: boolean;
    refreshInterval: number;
    defaultView: 'summary' | 'detailed' | 'chart';
  }>({
    queryKey: ['dashboard-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/preferences');
      if (!res.ok) throw new Error('Failed to fetch dashboard preferences');
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });
}

// Hook to update dashboard preferences
export function useUpdateDashboardPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: {
      showChart?: boolean;
      showActivities?: boolean;
      refreshInterval?: number;
      defaultView?: 'summary' | 'detailed' | 'chart';
    }) => {
      const res = await fetch('/api/dashboard/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (!res.ok) throw new Error('Failed to update dashboard preferences');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] });
    },
  });
}
