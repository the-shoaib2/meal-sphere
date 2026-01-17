import { useDashboard } from '@/hooks/use-dashboard';
import { DashboardActivity, DashboardChartData } from '@/hooks/use-dashboard';

// Context to share unified dashboard data across components
import { createContext, useContext, ReactNode } from 'react';

type DashboardContextType = {
    activities: DashboardActivity[] | undefined;
    chartData: DashboardChartData[] | undefined;
    isLoading: boolean;
    error: Error | null;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const { data, isLoading, error } = useDashboard();

    return (
        <DashboardContext.Provider
            value={{
                activities: data?.activities,
                chartData: data?.chartData,
                isLoading,
                error,
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
