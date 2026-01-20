import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchPeriodsData } from '@/lib/services/period-service';
import { fetchGroupsData } from '@/lib/services/groups-service'; // Need to resolve active group
import { PeriodManagement } from '@/components/periods/period-management';
import { Group } from '@/hooks/use-groups';

export const dynamic = 'force-dynamic';

export default async function PeriodsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // We need to know the active group to fetch periods.
  // Since we don't have client context here, we rely on the same logic as the layout/provider
  // to determine the "current" group (the one marked isCurrent, or the first one).

  // NOTE: This is a slight duplication of logic from layout.tsx, but necessary for the page to pre-fetch 
  // data for the *correct* group. Re-fetching groups data here is cheap because of unstable_cache.
  let activeGroupId: string | null = null;

  try {
    const groupsData = await fetchGroupsData(session.user.id);
    const activeGroup = groupsData.activeGroup || (groupsData.myGroups && groupsData.myGroups.length > 0 ? groupsData.myGroups[0] : null);
    if (activeGroup) {
      activeGroupId = activeGroup.id;
    }
  } catch (error) {
    console.error('Error determining active group for periods page:', error);
  }

  let periodsData = null;

  if (activeGroupId) {
    try {
      periodsData = await fetchPeriodsData(session.user.id, activeGroupId);
    } catch (error) {
      console.error('Error fetching periods data:', error);
    }
  }

  // Transform the periodsData into the format expected by usePeriodsPageData (PeriodsPageData)
  // periodsData from fetchPeriodsData has structure: { periods, activePeriod, periodStats, roomData, ... }
  // PeriodsPageData expects: { periods, currentPeriod, periodMode }

  let initialData = null;

  if (periodsData) {
    initialData = {
      periods: periodsData.periods,
      currentPeriod: periodsData.activePeriod,
      initialPeriodSummary: periodsData.initialPeriodSummary,
      periodMode: periodsData.roomData?.periodMode || 'MONTHLY',
      groupId: activeGroupId,
    };
  }

  return (
    <div className="space-y-6">
      <PeriodManagement initialData={initialData} />
    </div>
  );
} 