import { fetchDashboardAnalytics, fetchDashboardCharts } from '@/lib/services/dashboard-service';
import DetailedAnalytics from '@/components/dashboard/detailed-analytics';

interface AnalyticsWrapperProps {
    data: any;
}

export function AnalyticsWrapper({ data }: AnalyticsWrapperProps) {
    const { analytics, chartData } = data;

    return (
        <DetailedAnalytics
            mealDistribution={analytics.mealDistribution || []}
            expenseDistribution={analytics.expenseDistribution || []}
            monthlyExpenses={analytics.monthlyExpenses || []}
            mealRateTrend={analytics.mealRateTrend || []}
            roomStats={analytics.roomStats || []}
            chartData={chartData || []}
        />
    );
}
