"use client";

import { createContext, useContext, ReactNode } from 'react';

type DashboardRefreshContextType = {
    refresh: () => void;
    isRefreshing: boolean;
};

export const DashboardRefreshContext = createContext<DashboardRefreshContextType | undefined>(undefined);

export function useDashboardRefresh() {
    const context = useContext(DashboardRefreshContext);
    if (!context) {
        throw new Error('useDashboardRefresh must be used within DashboardShell');
    }
    return context;
}
