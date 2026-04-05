import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  getGroupPeriodModeAction, 
  updatePeriodModeAction 
} from '@/lib/actions/group.actions';
import { QUERY_KEYS } from '@/lib/constants/query-keys';

/**
 * Hook for managing the group's period mode (MONTHLY or CUSTOM).
 */
export function usePeriodMode(groupId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: periodMode = 'MONTHLY', isLoading } = useQuery<'MONTHLY' | 'CUSTOM'>({
    queryKey: ['period-mode', groupId],
    queryFn: async () => {
      if (!groupId) return 'MONTHLY';
      const result = await getGroupPeriodModeAction(groupId);
      if (!result.success) throw new Error(result.message || 'Failed to fetch period mode');
      return (result.periodMode as 'MONTHLY' | 'CUSTOM') || 'MONTHLY';
    },
    enabled: !!groupId,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updatePeriodMode = useMutation({
    mutationFn: async (mode: 'MONTHLY' | 'CUSTOM') => {
      if (!groupId) throw new Error('No group ID');
      const result = await updatePeriodModeAction(groupId, { mode });
      if (!result.success) throw new Error(result.message || 'Failed to update period mode');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-mode', groupId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERIODS, groupId] });
      router.refresh();
      toast.success('Period mode updated');
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
  
  return {
    periodMode,
    isLoading,
    updatePeriodMode: updatePeriodMode.mutate,
    isUpdating: updatePeriodMode.isPending,
  };
}
