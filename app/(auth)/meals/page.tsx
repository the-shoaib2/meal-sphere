import type { Metadata } from "next"
import MealManagement from "@/components/meal-management"

export const metadata: Metadata = {
  title: "Meal Management | MealSphere",
  description: "Manage your meals and meal preferences",
}

export default function MealsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Meal Management</h1>
        <p className="text-muted-foreground">Track and manage your daily meals</p>
      </div>

      <MealManagement />
    </div>
  )
}
