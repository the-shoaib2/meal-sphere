"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import MealCalendar from "@/components/meal/meal-calendar"

interface Period {
    name: string
    startDate: Date | string
    endDate?: Date | string | null
}

interface MealCalendarCardProps {
    selectedDate: Date
    onSelect: (date: Date) => void
    getMealCount: (date: Date) => number
    isLoading: boolean
    period?: Period | null
}

const MealCalendarCard = ({
    selectedDate,
    onSelect,
    getMealCount,
    isLoading,
    period,
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
                    period={period}
                />
            </CardContent>
        </Card>
    )
}

export default React.memo(MealCalendarCard)
