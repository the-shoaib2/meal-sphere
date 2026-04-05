/**
 * FACADE HOOK - usePeriods
 * This hook is now a wrapper around modular hooks to maintain backward compatibility
 */

import { usePeriodsList, usePeriodsByMonth } from './use-periods-list';
import { 
  usePeriodDetails, 
  useCurrentPeriod as useCurrentPeriodImpl, 
  usePeriodSummary as usePeriodSummaryImpl 
} from './use-period-details';
import { usePeriodMutations } from './use-period-mutations';
import { usePeriodMode } from './use-period-mode';
import { usePeriodManagement as usePeriodManagementImpl } from './use-period-management';
import { useActiveGroup } from '@/contexts/group-context';

export function usePeriods(includeArchived = false, initialData?: any) {
  const { activeGroup } = useActiveGroup();
  return usePeriodsList(activeGroup?.id, includeArchived, initialData?.periods);
}

export function usePeriodManagement(initialData?: any) {
  return usePeriodManagementImpl(initialData);
}

export function useCurrentPeriod(initialData?: any) {
  const { activeGroup } = useActiveGroup();
  return useCurrentPeriodImpl(activeGroup?.id, initialData?.currentPeriod);
}

export function usePeriod(periodId: string) {
  const { activeGroup } = useActiveGroup();
  return usePeriodDetails(activeGroup?.id, periodId);
}

export function usePeriodSummary(periodId: string, initialData?: any) {
  const { activeGroup } = useActiveGroup();
  return usePeriodSummaryImpl(activeGroup?.id, periodId, initialData);
}

export function useStartPeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.startPeriod;
}

export function useEndPeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.endPeriod;
}

export function useLockPeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.lockPeriod;
}

export function useUnlockPeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.unlockPeriod;
}

export function useArchivePeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.archivePeriod;
}

export function useRestartPeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.restartPeriod;
}

export function useUpdatePeriod() {
    const { activeGroup } = useActiveGroup();
    const mutations = usePeriodMutations(activeGroup?.id);
    return mutations.updatePeriod;
}

export { usePeriodMode, usePeriodsByMonth };
