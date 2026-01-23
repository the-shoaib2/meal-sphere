"use client";

import {
    Users,
    Utensils,
    CreditCard,
    ShoppingBag
} from "lucide-react";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { useRouter } from "next/navigation";

export function DashboardQuickActions() {
    const router = useRouter();

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Quick Actions</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                <QuickActionCard
                    icon={<Utensils className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="green"
                    title="Add Meal"
                    desc="Record today's meal"
                    onClick={() => router.push("/meals")}
                />
                <QuickActionCard
                    icon={<CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="blue"
                    title="Make Payment"
                    desc="Add payment record"
                    onClick={() => router.push("/payments")}
                />
                <QuickActionCard
                    icon={<ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="purple"
                    title="Shopping List"
                    desc="Manage shopping items"
                    onClick={() => router.push("/shopping")}
                />
                <QuickActionCard
                    icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
                    color="orange"
                    title="Group Settings"
                    desc="Manage group preferences"
                    onClick={() => router.push("/settings")}
                />
            </div>
        </div>
    );
}
