import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchPeriodsData } from '@/lib/services/period-service';
import { fetchGroupAccessData, fetchGroupsData } from '@/lib/services/groups-service';
import { PeriodManagement } from '@/components/periods/period-management';
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { PageHeader } from '@/components/shared/page-header';

export const dynamic = 'force-dynamic';

export default async function PeriodsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // We need to know the active group to fetch periods.
  let activeGroupId: string | null = null;
  let activeGroupName: string | null = null;

  try {
    const groupsData = await fetchGroupsData(session.user.id);
    const activeGroup = groupsData.activeGroup || (groupsData.myGroups && groupsData.myGroups.length > 0 ? groupsData.myGroups[0] : null);

    if (!activeGroup) {
      return (
        <div className="space-y-2">
          <PageHeader
            heading="Periods"
            description="Manage your group's meal periods"
          />
          <NoGroupState />
        </div>
      );
    }

    activeGroupId = activeGroup.id;
    activeGroupName = activeGroup.name;
  } catch (error) {
    console.error('Error determining active group for periods page:', error);
  }

  let periodsData = null;
  let accessData = null;

  if (activeGroupId) {
    try {
      // Fetch both in parallel
      [periodsData, accessData] = await Promise.all([
        fetchPeriodsData(session.user.id, activeGroupId),
        fetchGroupAccessData(activeGroupId, session.user.id)
      ]);
    } catch (error) {
      console.error('Error fetching periods data:', error);
    }
  }

  let initialData = null;

  if (periodsData) {
    initialData = {
      periods: periodsData.periods,
      currentPeriod: periodsData.activePeriod,
      initialPeriodSummary: periodsData.initialPeriodSummary,
      periodMode: periodsData.roomData?.periodMode || 'MONTHLY',
      groupId: activeGroupId,
      groupName: activeGroupName,
      initialAccessData: accessData,
    };
  }

  return (
    <div className="space-y-2">
      <PeriodManagement initialData={initialData} />
    </div>
  );
} 