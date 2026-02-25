import { fetchDashboardActivities, fetchDashboardCharts } from '@/lib/services/dashboard-service';
import { DashboardActivity } from '@/components/dashboard/dashboard-activity';

interface ActivityWrapperProps {
    userId: string;
    groupId: string;
}

export async function ActivityWrapper({ userId, groupId }: ActivityWrapperProps) {
    const [activities, chartData] = await Promise.all([
        fetchDashboardActivities(userId, groupId),
        fetchDashboardCharts(userId, groupId)
    ]);

    return (
        <DashboardActivity
            activities={activities}
            chartData={chartData}
        />
    );
}
