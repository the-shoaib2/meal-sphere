'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { PeriodsPageData } from '@/hooks/use-periods';

interface PeriodContextType {
    periodsData: PeriodsPageData | null;
    isLoading: boolean;
    error: Error | null;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children, initialData }: { children: ReactNode; initialData?: PeriodsPageData }) {
    // We strictly rely on server-provided data.
    // When the group changes, router.refresh() will update this initialData prop via the layout.
    const value = useMemo(() => ({
        periodsData: initialData || null,
        isLoading: false,
        error: null,
    }), [initialData]);

    return (
        <PeriodContext.Provider value={value}>
            {children}
        </PeriodContext.Provider>
    );
}

export function usePeriodContext() {
    const context = useContext(PeriodContext);
    if (context === undefined) {
        throw new Error('usePeriodContext must be used within a PeriodProvider');
    }
    return context;
}
