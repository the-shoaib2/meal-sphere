"use client"

import { Suspense } from "react"
import { useActiveGroup } from "@/contexts/group-context"
import MealManagement from "@/components/meal-management"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function MealsPage() {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<MealsLoading />}>
        <MealsContent />
      </Suspense>
    </div>
  )
}

function MealsContent() {
  const { activeGroup } = useActiveGroup()

  if (!activeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <MealManagement 
      roomId={activeGroup.id} 
      groupName={activeGroup.name}
    />
  )
}

function MealsLoading() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </CardContent>
    </Card>
  )
}
