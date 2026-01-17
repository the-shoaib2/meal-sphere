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

// Unified hook that fetches all dashboard data in a single parallel request
export function useDashboardUnified() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  return useQuery<{
    summary: DashboardSummary;
    activities: DashboardActivity[];
    chartData: DashboardChartData[];
  }>({
    queryKey: ['dashboard-unified', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const url = `/api/dashboard/unified?groupId=${activeGroup.id}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch dashboard data: ${res.status} ${errorText}`);
      }

      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 2)
    enabled: !!session?.user?.id && !!activeGroup?.id,
    refetchOnWindowFocus: false,
  });
}

// Legacy hook - kept for backward compatibility
export function useDashboardSummary() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();


  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const url = `/api/dashboard/summary/${activeGroup.id}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch dashboard summary: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 2)
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
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const res = await fetch('/api/dashboard/activities');
      if (!res.ok) throw new Error('Failed to fetch dashboard activities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!session?.user?.id && !!activeGroup?.id,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardChartData() {
  const { data: session } = useSession();
  const { activeGroup } = useActiveGroup();

  return useQuery<DashboardChartData[]>({
    queryKey: ['dashboard-chart-data', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) {
        throw new Error('No active group selected');
      }

      const res = await fetch('/api/dashboard/chart-data');
      if (!res.ok) throw new Error('Failed to fetch dashboard chart data');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!session?.user?.id && !!activeGroup?.id,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate unified query
      queryClient.invalidateQueries({ queryKey: ['dashboard-unified'] });
      // Keep legacy queries for backward compatibility
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
