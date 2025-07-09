"use client"

import { memo } from "react"
import { formatCurrency } from "@/lib/meal-calculations"

interface SummaryCardsProps {
  summary: any
}

// Memoized summary cards component
const SummaryCards = memo(({ summary }: SummaryCardsProps) => {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="flex flex-col items-center justify-center rounded-lg border p-3">
        <div className="text-xl font-bold">{summary.totalMeals}</div>
        <p className="text-xs text-muted-foreground">Total Meals</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border p-3">
        <div className="text-xl font-bold">{formatCurrency(summary.totalCost)}</div>
        <p className="text-xs text-muted-foreground">Total Cost</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border p-3">
        <div className="text-xl font-bold">{formatCurrency(summary.mealRate)}</div>
        <p className="text-xs text-muted-foreground">Per Meal Rate</p>
      </div>
    </div>
  )
})

SummaryCards.displayName = "SummaryCards"

export default SummaryCards 