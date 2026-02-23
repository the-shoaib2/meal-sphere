import { Suspense } from 'react';
import { fetchDashboardActivities, fetchDashboardCharts } from '@/lib/services/dashboard-service';
import { DashboardActivity } from '@/components/dashboard/dashboard-activity';

interface ActivityWrapperProps {
    data: any;
}

export function ActivityWrapper({ data }: ActivityWrapperProps) {
    const { activities, chartData } = data;

    return (
        <DashboardActivity
            activities={activities}
            chartData={chartData}
        />
    );
}
