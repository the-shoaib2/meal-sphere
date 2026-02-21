"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MealCalendar from "./meal-calendar"

interface MealCalendarCardProps {
    selectedDate: Date
    onSelect: (date: Date) => void
    getMealCount: (date: Date) => number
    isLoading: boolean
}

const MealCalendarCard = ({
    selectedDate,
    onSelect,
    getMealCount,
    isLoading,
}: MealCalendarCardProps) => {
    return (
        <Card>
            <CardHeader className="pb-1" />
            <CardContent>
                <MealCalendar
                    selected={selectedDate}
                    onSelect={onSelect}
                    getMealCount={getMealCount}
                    isLoading={isLoading}
                />
            </CardContent>
        </Card>
    )
}

export default React.memo(MealCalendarCard)
