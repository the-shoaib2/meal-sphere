"use client"

import { useActiveGroup } from "@/contexts/group-context"
import MealManagement from "@/components/meal/meal-management"
import { useSearchParams } from "next/navigation"
import { MealManagementSkeleton } from "@/components/meal/meal-skeletons";
import { NoGroupState } from "@/components/empty-states/no-group-state";
import { useGroups } from "@/hooks/use-groups";

export default function MealsPage() {
  const { activeGroup } = useActiveGroup()
  const searchParams = useSearchParams()
  const { data: userGroups = [], isLoading: isLoadingGroups } = useGroups();

  // Check if user has no groups - show empty state
  if (!isLoadingGroups && userGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meal Management</h1>
            <p className="text-muted-foreground text-sm">
              Track and manage your meals
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  // Always render MealManagement, let it handle loading and skeletons
  if (!activeGroup?.id) return <MealManagementSkeleton />;

  return (
    <div className="space-y-6">
      <MealManagement
        roomId={activeGroup.id}
        groupName={activeGroup.name}
        searchParams={searchParams}
      />
    </div>
  )
}


