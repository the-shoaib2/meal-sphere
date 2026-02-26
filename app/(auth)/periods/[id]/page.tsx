import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { fetchPeriodsData, PeriodService } from '@/lib/services/period-service';
import { fetchGroupAccessData, fetchGroupsData } from '@/lib/services/groups-service';
import { PeriodDetails } from '@/components/periods/period-details';
import { NoGroupState } from '@/components/empty-states/no-group-state';
import { PageHeader } from '@/components/shared/page-header';


export default async function PeriodDetailsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    const { id: periodId } = await params;

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
    let specificPeriodSummary = null;

    if (activeGroupId) {
        try {
            // Fetch data in parallel
            // We fetch the standard periods data (for the list) AND the specific summary for this page
            const [pData, aData, summary] = await Promise.all([
                fetchPeriodsData(session.user.id, activeGroupId),
                fetchGroupAccessData(activeGroupId, session.user.id),
                PeriodService.calculatePeriodSummary(periodId, activeGroupId).catch(() => null)
            ]);

            periodsData = pData;
            accessData = aData;
            specificPeriodSummary = summary;

        } catch (error) {
            console.error('Error fetching periods data:', error);
        }
    }

    let initialData = null;

    if (periodsData) {
        initialData = {
            periods: periodsData.periods,
            currentPeriod: periodsData.activePeriod,
            // Priority: use the specific summary request for this page
            initialPeriodSummary: specificPeriodSummary || periodsData.initialPeriodSummary,
            periodMode: periodsData.roomData?.periodMode || 'MONTHLY',
            groupId: activeGroupId,
            groupName: activeGroupName,
            initialAccessData: accessData,
            // Explicitly tell the component which period is selected
            selectedPeriodId: periodId,
        };
    }

    return (
        <div className="space-y-4 w-full min-w-0 flex flex-col">
            <PeriodDetails initialData={initialData} />
        </div>
    );
}
