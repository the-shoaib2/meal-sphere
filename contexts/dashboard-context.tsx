"use client";

import { DashboardActivity, DashboardChartData } from '@/types/dashboard';

// Context to share unified dashboard data across components
import { createContext, useContext, ReactNode } from 'react';

type DashboardContextType = {
    // Data
    activities: DashboardActivity[] | undefined;
    chartData: DashboardChartData[] | undefined;

    // Status
    isLoading: boolean;
    error: Error | null;

    // Refresh Logic
    refresh: () => void;
    isRefreshing: boolean;
};

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboardContext() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboardContext must be used within DashboardShell');
    }
    return context;
}
