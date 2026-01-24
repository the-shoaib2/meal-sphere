import { fetchDashboardAnalytics, fetchDashboardCharts } from '@/lib/services/dashboard-service';
import DetailedAnalytics from '@/components/dashboard/detailed-analytics';

interface AnalyticsWrapperProps {
    userId: string;
    groupId: string;
}

export async function AnalyticsWrapper({ userId, groupId }: AnalyticsWrapperProps) {
    const [analytics, chartData] = await Promise.all([
        fetchDashboardAnalytics(userId, groupId),
        fetchDashboardCharts(userId, groupId)
    ]);

    return (
        <DetailedAnalytics
            mealDistribution={analytics.mealDistribution}
            expenseDistribution={analytics.expenseDistribution}
            monthlyExpenses={analytics.monthlyExpenses}
            mealRateTrend={analytics.mealRateTrend}
            roomStats={analytics.roomStats}
            chartData={chartData}
        />
    );
}
