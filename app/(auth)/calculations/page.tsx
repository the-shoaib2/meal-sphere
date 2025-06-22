"use client"

import MealCalculations from "@/components/meal-calculations"
import { useActiveGroup } from "@/contexts/group-context"
import { Loader2 } from "lucide-react"

export default function CalculationsPage() {
  const { activeGroup, isLoading } = useActiveGroup()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!activeGroup) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold">No Group Selected</h2>
        <p className="text-muted-foreground">Please select a group to view calculations.</p>
      </div>
    )
  }

  return <MealCalculations roomId={activeGroup.id} />
}
