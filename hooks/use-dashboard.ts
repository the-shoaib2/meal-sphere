import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useActiveGroup } from '@/contexts/group-context';

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
};

export type DashboardActivity = {
  id: string;
  type: 'MEAL' | 'PAYMENT' | 'EXPENSE' | 'GROUP_JOIN' | 'GROUP_LEAVE';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  groupName?: string;
};

export type DashboardChartData = {
  date: string;
  meals: number;
  expenses: number;
  balance: number;
};

export function useDashboardSummary() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  console.log('useDashboardSummary - Session:', !!session?.user?.id, 'Active Group:', activeGroup?.name, 'Group ID:', activeGroup?.id);
  
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }
      
      console.log('Fetching dashboard summary for group:', activeGroup.name, 'ID:', activeGroup.id);
      const url = `/api/dashboard/summary/${activeGroup.id}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Dashboard summary fetch failed:', res.status, errorText);
        throw new Error(`Failed to fetch dashboard summary: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Dashboard summary fetched successfully:', data);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for more responsive updates
    enabled: !!session?.user?.id && !!activeGroup?.id,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardActivities() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  return useQuery<DashboardActivity[]>({
    queryKey: ['dashboard-activities', activeGroup?.id],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/activities');
      if (!res.ok) throw new Error('Failed to fetch dashboard activities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardChartData() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();
  
  return useQuery<DashboardChartData[]>({
    queryKey: ['dashboard-chart-data', activeGroup?.id],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/chart-data');
      if (!res.ok) throw new Error('Failed to fetch dashboard chart data');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // This is a placeholder for any refresh logic
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate all dashboard-related queries
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-chart-data'] });
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
  const { data: session } = useSession();
  
  return useQuery<DashboardSummary>({
    queryKey: ['group-dashboard-stats', groupId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/group-stats?groupId=${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch group dashboard stats');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!session?.user?.id && !!groupId,
    refetchOnWindowFocus: false,
  });
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
