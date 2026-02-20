"use client"

import { useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMeal, type MealType } from "@/hooks/use-meal"
import MealList from "@/components/meal/meal-list"
import GuestMealManager from "@/components/meal/guest-meal-manager"
import { useCallback, useMemo } from "react"
import { toast } from "react-hot-toast"

interface MealListViewProps {
    roomId: string
    selectedDate: Date
    userRole: string | null
    initialData?: any
}

export default function MealListView({ roomId, selectedDate, userRole, initialData }: MealListViewProps) {
    const { data: session } = useSession()
    const queryClient = useQueryClient()

    const {
        toggleMeal,
        deleteGuestMeal,
        useMealsByDate,
        useGuestMealsByDate,
        isLoading,
        isLoadingUserStats
    } = useMeal(roomId, selectedDate, initialData, userRole)

    const mealsForDate = useMemo(() => useMealsByDate(selectedDate), [useMealsByDate, selectedDate])
    const guestMealsForDate = useMemo(() => useGuestMealsByDate(selectedDate), [useGuestMealsByDate, selectedDate])

    const isAnyLoading = isLoading || isLoadingUserStats

    const handleToggleMeal = useCallback(async (type: MealType, userId?: string) => {
        const targetUserId = userId || session?.user?.id
        if (!targetUserId) return
        try {
            await toggleMeal(selectedDate, type, targetUserId)
        } catch (error) {
            console.error("Error toggling meal:", error)
            toast.error("Failed to update meal")
        }
    }, [session?.user?.id, selectedDate, toggleMeal])

    const handleDeleteGuestMeal = useCallback(async (guestMealId: string) => {
        try {
            await deleteGuestMeal(guestMealId)
        } catch (error) {
            console.error("Error deleting guest meal:", error)
            toast.error("Failed to delete guest meal")
        }
    }, [deleteGuestMeal])

    // Admin and managers can edit guest meals
    const isPrivileged = userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const isPastDate = selectedDate < todayStart
    const canEditGuestMeals = !!(isPrivileged || !isPastDate)

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>All Meals for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <MealList
                        mealsForDate={mealsForDate as any}
                        guestMealsForDate={guestMealsForDate}
                        session={session}
                        isLoading={isAnyLoading}
                        userRole={userRole}
                        handleToggleMeal={handleToggleMeal}
                        handleDeleteGuestMeal={handleDeleteGuestMeal}
                    />
                </CardContent>
            </Card>
            <GuestMealManager
                roomId={roomId}
                date={selectedDate}
                initialData={initialData}
                isLoading={isAnyLoading}
                canEdit={canEditGuestMeals}
                onUpdate={() => {
                    const userId = session?.user?.id;
                    queryClient.invalidateQueries({ queryKey: ['group-balances', roomId] });
                    queryClient.invalidateQueries({ queryKey: ['user-balance', roomId, userId] });
                }}
            />
        </div>
    )
}
