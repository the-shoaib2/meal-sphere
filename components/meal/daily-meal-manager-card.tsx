"use client"

import React from "react"
import { format, isToday, isSameDay } from "date-fns"
import { Plus, Minus, Zap, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import type { MealType } from "@/hooks/use-meal"
import GuestMealForm from "@/components/meal/guest-meal-form"

interface DailyMealManagerCardProps {
    roomId: string
    selectedDate: Date
    isLoading: boolean
    mealSettings: any
    autoMealSettings: any
    currentPeriod: any
    userHasMeal: (type: MealType) => boolean
    getUserMealCount: (date: Date, type: MealType) => number
    getUserGuestMealCount: (date: Date, type: MealType) => number
    shouldAutoAddForUser: (type: MealType) => boolean
    isAutoTimeForMeal: (type: MealType) => boolean
    canEditMeal: (type: MealType) => boolean
    canAddMeal: (date: Date, type: MealType) => boolean
    handleToggleMeal: (type: MealType) => void
    addGuestMeal: (date: Date, type: MealType, count: number) => Promise<void>
    canEditGuestMeal: (date: Date, type: MealType) => boolean
}

const DailyMealManagerCard = ({
    roomId,
    selectedDate,
    isLoading,
    mealSettings,
    autoMealSettings,
    currentPeriod,
    userHasMeal,
    getUserMealCount,
    getUserGuestMealCount,
    shouldAutoAddForUser,
    isAutoTimeForMeal,
    canEditMeal,
    canAddMeal,
    handleToggleMeal,
    addGuestMeal,
    canEditGuestMeal,
}: DailyMealManagerCardProps) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg sm:text-xl">
                    {format(selectedDate, "MMMM d, yyyy")}
                    {isToday(selectedDate) && " (Today)"}
                </CardTitle>
                <GuestMealForm
                    roomId={roomId}
                    date={selectedDate}
                    addGuestMeal={addGuestMeal}
                    canEditGuestMeal={canEditGuestMeal}
                    mealSettings={mealSettings}
                    autoMealSettings={autoMealSettings}
                    currentPeriod={currentPeriod}
                />
            </CardHeader>
            <CardContent>
                <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader />
                            </div>
                        ) : (
                            (["BREAKFAST", "LUNCH", "DINNER"] as MealType[]).map((mealType) => {
                                const hasMealSelected = userHasMeal(mealType)
                                const mealCount = getUserMealCount(selectedDate, mealType)
                                const guestCount = getUserGuestMealCount(selectedDate, mealType)
                                const mealTypeIcon =
                                    mealType === "BREAKFAST"
                                        ? "🌅"
                                        : mealType === "LUNCH"
                                            ? "☀️"
                                            : "🌙"
                      
                                const shouldAutoAdd = shouldAutoAddForUser(mealType)
                                const isAutoTime = isAutoTimeForMeal(mealType)

                                // Check if meal time has passed for today
                                const now = new Date()
                                const isTodaySelected = isSameDay(selectedDate, now)
                                let mealTimeStr = ""
                                if (mealType === "BREAKFAST")
                                    mealTimeStr = mealSettings?.breakfastTime || "08:00"
                                if (mealType === "LUNCH")
                                    mealTimeStr = mealSettings?.lunchTime || "13:00"
                                if (mealType === "DINNER")
                                    mealTimeStr = mealSettings?.dinnerTime || "20:00"
                                const [hours, minutes] = mealTimeStr.split(":").map(Number)
                                const mealTime = new Date(selectedDate)
                                mealTime.setHours(hours, minutes, 0, 0)
                                const mealTimePassed = isTodaySelected && now >= mealTime

                                return (
                                    <div
                                        key={mealType}
                                        className="flex items-center justify-between p-3 sm:p-4 bg-muted/80 hover:bg-muted rounded-xl transition-colors gap-3 sm:gap-4"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className={`p-1.5 sm:p-2 rounded-full flex-shrink-0`}
                                            >
                                                <span className="text-base sm:text-lg">
                                                    {mealTypeIcon}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-sm sm:text-base block">
                                                    {mealType}
                                                </span>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs px-1.5 py-0.5 h-5"
                                                    >
                                                        {mealCount} total
                                                    </Badge>
                                                    {hasMealSelected && (
                                                        <Badge
                                                            variant="default"
                                                            className="bg-green-200/20 hover:bg-green-200/20 text-green-500 text-xs px-1.5 py-0.5 h-5"
                                                        >
                                                            ✓ You&apos;re in
                                                        </Badge>
                                                    )}
                                                    {guestCount > 0 && (
                                                        <Badge
                                                            variant="default"
                                                            className="text-xs px-1.5 py-0.5 h-5"
                                                        >
                                                            +{guestCount} guest
                                                        </Badge>
                                                    )}
                                                    {shouldAutoAdd && (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-blue-50 text-blue-600 border-blue-200 text-xs px-1.5 py-0.5 h-5 flex items-center gap-0.5"
                                                        >
                                                            <Zap className="h-2.5 w-2.5" />
                                                            Auto
                                                        </Badge>
                                                    )}
                                                    {isAutoTime && (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-orange-50 text-orange-600 border-orange-200 text-xs px-1.5 py-0.5 h-5 flex items-center gap-0.5"
                                                        >
                                                            <Clock className="h-2.5 w-2.5" />
                                                            Time
                                                        </Badge>
                                                    )}
                                                    {mealTimePassed && (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-red-50 text-red-600 border-red-200 text-xs px-1.5 py-0.5 h-5 flex items-center gap-0.5"
                                                        >
                                                            <Clock className="h-2.5 w-2.5" />
                                                            Time Passed
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Button
                                                variant={hasMealSelected ? "destructive" : "default"}

                                                className="rounded-full px-4 text-xs sm:text-sm "
                                                onClick={() => handleToggleMeal(mealType)}
                                                disabled={
                                                    isLoading ||
                                                    (!hasMealSelected &&
                                                        !canAddMeal(selectedDate, mealType)) ||
                                                    !canEditMeal(mealType)
                                                }
                                            >
                                                {hasMealSelected ? (
                                                    <>
                                                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        Remove
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        Add
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default React.memo(DailyMealManagerCard)
