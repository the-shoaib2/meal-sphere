'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useActiveGroup } from './group-context';
import { useCurrentPeriod, usePeriods, useStartPeriod, useEndPeriod, PeriodSummary, PeriodsPageData } from '@/hooks/use-periods';
import { MealPeriod, PeriodStatus } from '@prisma/client';

interface PeriodContextType {
    // Data
    currentPeriod: MealPeriod | null;
    activePeriodSummary: PeriodSummary | null;
    isLoading: boolean;
    error: Error | null;

    // Actions
    startNewPeriod: (data: any) => Promise<any>;
    endCurrentPeriod: (endDate?: Date) => Promise<any>;

    // Helpers
    hasActivePeriod: boolean;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children, initialData }: { children: ReactNode; initialData?: PeriodsPageData }) {
    const { activeGroup } = useActiveGroup();

    // Use hooks to fetch data
    // We prioritize the "Current Period" for global context
    const {
        data: currentPeriod,
        isLoading: isLoadingPeriod,
        error: periodError
    } = useCurrentPeriod(initialData);

    // We might also want separate summary if needed, but often it's fetched on demand
    // For global context, maybe we keep it light.

    const startPeriodMutation = useStartPeriod();
    const endPeriodMutation = useEndPeriod();

    const startNewPeriod = async (data: any) => {
        return startPeriodMutation.mutateAsync(data);
    };

    const endCurrentPeriod = async (endDate?: Date) => {
        if (!currentPeriod?.id) throw new Error('No active period to end');
        return endPeriodMutation.mutateAsync({ periodId: currentPeriod.id, endDate });
    };

    const value = {
        currentPeriod: currentPeriod || null,
        activePeriodSummary: null, // We could fetch this if needed globally
        isLoading: isLoadingPeriod,
        error: periodError,
        startNewPeriod,
        endCurrentPeriod,
        hasActivePeriod: !!currentPeriod,
    };

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
