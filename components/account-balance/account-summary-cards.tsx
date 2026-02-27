"use client";

import React from 'react';
import { Users, TrendingUp, DollarSign, Calculator, Receipt, Utensils } from 'lucide-react';
import { StatCard } from './stat-card';
import type { GroupBalanceSummary } from '@/hooks/use-account-balance';

interface AccountSummaryCardsProps {
    groupData: GroupBalanceSummary;
}

export function AccountSummaryCards({ groupData }: AccountSummaryCardsProps) {
    if (!groupData) return null;

    const {
        members = [],
        groupTotalBalance = 0,
        totalExpenses = 0,
        mealRate = 0,
        totalMeals = 0,
        netGroupBalance = 0
    } = groupData as any;

    const activeBalancesCount = members.filter((m: any) => m.balance !== 0).length;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard icon={Users} title="Total Members" value={members.length} />
                <StatCard icon={TrendingUp} title="Active Balances" value={activeBalancesCount} />
                <StatCard
                    icon={DollarSign}
                    title="Group Total"
                    value={`৳${groupTotalBalance.toFixed(2)}`}
                    isCurrency
                    isPositive={groupTotalBalance >= 0}
                />
                <StatCard
                    icon={Calculator}
                    title="Balance Status"
                    value={netGroupBalance === 0 ? 'Balanced' : 'Unbalanced'}
                    isCurrency
                    isPositive={netGroupBalance === 0}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <StatCard
                    icon={Receipt}
                    title="Total Expenses"
                    value={`৳${totalExpenses.toFixed(2)}`}
                    isCurrency
                    isPositive={false}
                />
                <StatCard
                    icon={Utensils}
                    title="Total Meals"
                    value={totalMeals}
                />
                <StatCard
                    icon={Calculator}
                    title="Meal Rate"
                    value={`৳${mealRate.toFixed(2)}`}
                    isCurrency
                    isPositive={true}
                />
            </div>
        </div>
    );
}
