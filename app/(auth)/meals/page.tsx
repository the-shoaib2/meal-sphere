"use client"

import { useActiveGroup } from "@/contexts/group-context"
import MealManagement from "@/components/meal-management"

export default function MealsPage() {
  const { activeGroup } = useActiveGroup()
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meal Management</h1>
        <p className="text-muted-foreground">
          {activeGroup 
            ? `Track and manage your daily meals for ${activeGroup.name}`
            : 'Track and manage your daily meals'}
        </p>
      </div>

      <MealManagement groupName={activeGroup?.name || undefined} />
    </div>
  )
}
