"use client"

import React from "react"
import { format } from "date-fns"
import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import MealList from "./meal-list"
import type { MealType } from "@/hooks/use-meal"

interface AllMealsCardProps {
    selectedDate: Date
    mealsForDate: any[]
    guestMealsForDate: any[]
    currentUserId?: string
    isLoading: boolean
    userRole: string | null
    handleToggleMeal: (type: MealType, userId: string) => void
    handleDeleteGuestMeal: (id: string) => Promise<void>
}

const AllMealsCard = ({
    selectedDate,
    mealsForDate,
    guestMealsForDate,
    currentUserId,
    isLoading,
    userRole,
    handleToggleMeal,
    handleDeleteGuestMeal,
}: AllMealsCardProps) => {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-full">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        All Meals — {format(selectedDate, "MMMM d, yyyy")}
                    </div>
                    {(() => {
                        const totalGuestMeals = (guestMealsForDate || []).reduce(
                            (sum, m) => sum + (m.count || 0),
                            0
                        )
                        if (totalGuestMeals === 0) return null
                        return (
                            <Badge
                                variant="default"
                            >
                                {totalGuestMeals} guest meal{totalGuestMeals > 1 ? "s" : ""}
                            </Badge>
                        )
                    })()}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <MealList
                    mealsForDate={mealsForDate as any}
                    guestMealsForDate={guestMealsForDate}
                    currentUserId={currentUserId}
                    isLoading={isLoading}
                    userRole={userRole}
                    handleToggleMeal={handleToggleMeal}
                    handleDeleteGuestMeal={handleDeleteGuestMeal}
                />
            </CardContent>
        </Card>
    )
}

export default React.memo(AllMealsCard)
