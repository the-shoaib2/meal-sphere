"use client";

import { DashboardActivity, DashboardChartData } from '@/types/dashboard';

// Context to share unified dashboard data across components
import { createContext, useContext, ReactNode } from 'react';

type DashboardContextType = {
    activities: DashboardActivity[] | undefined;
    chartData: DashboardChartData[] | undefined;
    isLoading: boolean;
    error: Error | null;
};

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);



export function StaticDashboardProvider({
    children,
    activities,
    chartData
}: {
    children: ReactNode,
    activities: DashboardActivity[],
    chartData: DashboardChartData[]
}) {
    return (
        <DashboardContext.Provider
            value={{
                activities,
                chartData,
                isLoading: false,
                error: null,
            }}
        >
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboardContext() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboardContext must be used within DashboardProvider');
    }
    return context;
}
