"use client"

import { useActiveGroup } from "@/contexts/group-context"
import MealManagement from "@/components/meal-management"
import { useSearchParams } from "next/navigation"
import { MealManagementSkeleton } from "@/components/meal/meal-skeletons";

export default function MealsPage() {
  const { activeGroup } = useActiveGroup()
  const searchParams = useSearchParams()

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


