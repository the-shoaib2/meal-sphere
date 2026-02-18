"use client";


import {
    Users,
    Utensils,
    CreditCard,
    ShoppingBag
} from "lucide-react";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { useRouter } from "next/navigation";
import { useDashboardLoading } from "@/components/dashboard/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardQuickActions() {
    const router = useRouter();
    const { isLoading } = useDashboardLoading();

    return (
        <div className="space-y-4 sm:space-y-5 px-1">
            <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-primary" />
                <div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight">Quick Actions</h2>
                </div>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                    icon={<Utensils className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="green"
                    title="Add Meal"
                    desc="Record today's meal"
                    onClick={() => router.push("/meals")}
                    isLoading={isLoading}
                />
                <QuickActionCard
                    icon={<CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="blue"
                    title="Make Payment"
                    desc="Add payment record"
                    onClick={() => router.push("/payments")}
                    isLoading={isLoading}
                />
                <QuickActionCard
                    icon={<ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="purple"
                    title="Shopping List"
                    desc="Manage shopping items"
                    onClick={() => router.push("/shopping")}
                    isLoading={isLoading}
                />
                <QuickActionCard
                    icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="orange"
                    title="Group Settings"
                    desc="Manage group preferences"
                    onClick={() => router.push("/settings")}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
