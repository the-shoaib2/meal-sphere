"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { Plus, Settings, Clock, Users, Utensils, Minus, Zap, ShieldCheck } from "lucide-react"
import { format, startOfMonth, endOfMonth, isToday, isSameDay, eachDayOfInterval } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMeal, type MealType, type MealsPageData } from "@/hooks/use-meal"
import { useGroupAccess } from "@/hooks/use-group-access"
import { useCurrentPeriod } from "@/hooks/use-periods"
import { isPeriodLocked } from "@/lib/utils/period-utils-shared"
import GuestMealForm from "@/components/meal/guest-meal-form"
import MealCalendar from "@/components/meal/meal-calendar"
import { Loader } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import MealSummary from "@/components/meal/meal-summary"
import type { ReadonlyURLSearchParams } from "next/navigation"
import MealSettingsDialog from "@/components/meal/meal-settings-dialog";
import AutoMealSettingsDialog from "@/components/meal/auto-meal-settings-dialog";
import { PageHeader } from "@/components/shared/page-header";




interface MealWithUser {
  id: string
  date: string
  type: MealType
  userId: string
  roomId: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface MealManagementProps {
  roomId: string
  groupName?: string
  searchParams?: ReadonlyURLSearchParams | null
  initialData?: MealsPageData
  initialAccessData?: any
}

export default function MealManagement({ roomId, groupName, searchParams: propSearchParams, initialData, initialAccessData }: MealManagementProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const searchParams = propSearchParams || useSearchParams()

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = typeof searchParams?.get === 'function'
      ? searchParams.get('date')
      : (searchParams as any)?.date;

    if (dateParam) {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  });
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [autoSettingsOpen, setAutoSettingsOpen] = useState(false)

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const dateFromUrl = typeof searchParams?.get === 'function' ? searchParams.get('date') : (searchParams as any)?.date;
    if (dateFromUrl) {
      const parsed = new Date(dateFromUrl);
      if (!isNaN(parsed.getTime()) && !isSameDay(parsed, selectedDate)) {
        setSelectedDate(parsed);
      }
    }
  }, [searchParams]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    // Update URL
    const currentParams = typeof searchParams?.get === 'function'
      ? searchParams.toString()
      : (searchParams || {});
    const params = new URLSearchParams(currentParams as any);
    params.set('date', format(date, 'yyyy-MM-dd'));
    router.push(`/meals?${params.toString()}`, { scroll: false });
  };


  // Check user permissions
  const { userRole, isMember, isLoading: isAccessLoading } = useGroupAccess({
    groupId: roomId,
    initialData: initialAccessData
  })

  // Get current period
  const { data: currentPeriod, isLoading: isPeriodLoading } = useCurrentPeriod()

  // Check if user can manage meal settings (only when not loading)
  const canManageMealSettings = !isAccessLoading && userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)

  // Check if user can manage AUTO meal settings admin-level (turn on/off the whole system)
  const canManageAutoMeals = !isAccessLoading && userRole && ['ADMIN'].includes(userRole)


  const {
    meals,
    guestMeals,
    mealSettings,
    autoMealSettings,
    userMealStats,
    isLoading,
    isLoadingUserStats,
    useMealsByDate,
    useGuestMealsByDate,
    useMealCount,
    getUserMealCount,
    getUserGuestMealCount,
    toggleMeal,
    updateMealSettings,
    updateAutoMealSettings,
    hasMeal,
    canAddMeal,
    triggerAutoMeals,
    shouldAutoAddMeal,
    isAutoMealTime,
    deleteGuestMeal
  } = useMeal(roomId, selectedDate, initialData, userRole)

  // Memoized and callback hooks (must be before any early return)
  const mealsForDate = useMemo(() => useMealsByDate(selectedDate) as MealWithUser[], [useMealsByDate, selectedDate])
  const guestMealsForDate = useMemo(() => useGuestMealsByDate(selectedDate), [useGuestMealsByDate, selectedDate])

  // All members can access their personal Auto Meal Settings when admin has enabled the system
  // Admins can always access it (to configure the system itself)
  const canAccessAutoMealSettings = !isAccessLoading && userRole && (
    ['ADMIN'].includes(userRole) || mealSettings?.autoMealEnabled
  )

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

  const handleTriggerAutoMeals = useCallback(async () => {
    try {
      await triggerAutoMeals(selectedDate)
    } catch (error) {
      console.error("Error triggering auto meals:", error)
      toast.error("Failed to trigger auto meals")
    }
  }, [selectedDate, triggerAutoMeals])

  const handleDeleteGuestMeal = useCallback(async (guestMealId: string) => {
    try {
      await deleteGuestMeal(guestMealId)
    } catch (error) {
      console.error("Error deleting guest meal:", error)
      toast.error("Failed to delete guest meal")
    }
  }, [deleteGuestMeal])

  const userHasMeal = useCallback((type: MealType) => {
    if (!session?.user?.id) return false
    return hasMeal(selectedDate, type, session.user.id)
  }, [session?.user?.id, selectedDate, hasMeal])

  const shouldAutoAddForUser = useCallback((type: MealType) => {
    return shouldAutoAddMeal(selectedDate, type)
  }, [selectedDate, shouldAutoAddMeal])

  const isAutoTimeForMeal = useCallback((type: MealType) => {
    return isAutoMealTime(selectedDate, type)
  }, [selectedDate, isAutoMealTime])

  // Header (always visible)
  const header = (
    <PageHeader
      heading="Meals"
      text={
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-1">
          <span className="text-muted-foreground block sm:inline">Manage meals for {groupName || "your group"}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {userRole && (
              <Badge variant="default" className="bg-red-500 text-white hover:bg-red-600 transition-colors uppercase tracking-wider text-[10px] font-bold px-2 flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" />
                {userRole}
              </Badge>
            )}
            {currentPeriod && (
              <Badge
                variant={isPeriodLocked(currentPeriod) ? "destructive" : "outline"}
                className={cn(
                  "text-[10px] font-bold px-2 uppercase tracking-wider shrink-0",
                  !isPeriodLocked(currentPeriod) && "border-green-500/50 text-green-600 bg-green-50"
                )}
              >
                {currentPeriod.name} {isPeriodLocked(currentPeriod) ? "• Locked" : "• Active"}
              </Badge>
            )}
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {userRole === 'ADMIN' && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all"
            onClick={() => router.push('/meals/list')}
          >
            <Utensils className="h-4 w-4" />
            Admin Meal List
          </Button>
        )}
        <GuestMealForm roomId={roomId} onSuccess={() => { }} initialData={initialData} />

        {canManageMealSettings && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 shrink-0 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all"
            onClick={() => setSettingsOpen(true)}
            title="Meal Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        {canAccessAutoMealSettings && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 shrink-0 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all"
            onClick={() => setAutoSettingsOpen(true)}
            title="Auto Meal Settings"
          >
            <Clock className="h-4 w-4" />
          </Button>
        )}
      </div>
    </PageHeader>
  );

  // Consolidated loading state
  const isAnyLoading = isLoading || isAccessLoading || isPeriodLoading || isLoadingUserStats;




  // Get meal counts for calendar display
  const getMealCountsForMonth = () => {
    const start = startOfMonth(selectedDate)
    const end = endOfMonth(selectedDate)
    const days = eachDayOfInterval({ start, end })

    return days.map(day => ({
      date: day,
      breakfast: useMealCount(day, 'BREAKFAST'),
      lunch: useMealCount(day, 'LUNCH'),
      dinner: useMealCount(day, 'DINNER'),
      total: useMealCount(day, 'BREAKFAST') + useMealCount(day, 'LUNCH') + useMealCount(day, 'DINNER')
    }))
  }


  // Helper: check if user can edit meal for a type (not after meal time unless privileged)
  const canEditMeal = (type: MealType) => {
    if (!session?.user?.id) return false

    const now = new Date()
    const targetDate = new Date(selectedDate)
    const isToday = isSameDay(targetDate, now)

    // BYPASS: Admins, Managers, and Meal Managers can skip other checks (limits, past/future dates, time restrictions)
    const privileged = userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)
    if (privileged) return true

    // RESTRICTED: For today, check meal time cutoff
    if (isToday) {
      if (!mealSettings) return true

      // Get meal time for the specific type
      let mealTimeStr = ''
      if (type === 'BREAKFAST') mealTimeStr = mealSettings.breakfastTime || '08:00'
      if (type === 'LUNCH') mealTimeStr = mealSettings.lunchTime || '13:00'
      if (type === 'DINNER') mealTimeStr = mealSettings.dinnerTime || '20:00'

      // Parse meal time
      const [hours, minutes] = mealTimeStr.split(':').map(Number)
      const mealTime = new Date(targetDate)
      mealTime.setHours(hours, minutes, 0, 0)

      // If time passed, member cannot add/toggle today
      if (now >= mealTime) {
        return false;
      }
    }

    // RESTRICTED: Non-privileged users cannot edit past meals (before today)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    if (targetDate < todayStart) {
      return false
    }

    // Allow future dates
    return true
  }


  // Check if user can edit guest meals (same restriction: no past days unless privileged)
  const isPrivileged = userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const isPastDate = selectedDate < todayStart
  const canEditGuestMeals = !!(isPrivileged || !isPastDate)

  return (
    <div className="space-y-6">
      {header}

      {/* User Meal Summary */}
      <MealSummary
        selectedDate={selectedDate}
        getUserMealCount={getUserMealCount}
        getUserGuestMealCount={getUserGuestMealCount}
        isLoading={isAnyLoading}
      />

      {/* Meal Calendar View */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <MealCalendar
                selected={selectedDate}
                onSelect={handleDateSelect}
                getMealCount={(date: Date) => useMealCount(date, 'BREAKFAST') + useMealCount(date, 'LUNCH') + useMealCount(date, 'DINNER')}
                isLoading={isAnyLoading}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Meals for {format(selectedDate, 'MMMM d, yyyy')}
                {isToday(selectedDate) && ' (Today)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {isAnyLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader />
                    </div>
                  ) : (
                    (['BREAKFAST', 'LUNCH', 'DINNER'] as MealType[]).map((mealType) => {
                      const hasMealSelected = userHasMeal(mealType)
                      const mealCount = getUserMealCount(selectedDate, mealType)
                      const mealTypeIcon = mealType === 'BREAKFAST' ? '🌅' : mealType === 'LUNCH' ? '☀️' : '🌙'
                      const mealTypeColor = mealType === 'BREAKFAST' ? 'bg-orange-100 text-orange-700' :
                        mealType === 'LUNCH' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                      const shouldAutoAdd = shouldAutoAddForUser(mealType)
                      const isAutoTime = isAutoTimeForMeal(mealType)

                      // Check if meal time has passed for today
                      const now = new Date()
                      const isTodaySelected = isSameDay(selectedDate, now)
                      let mealTimeStr = ''
                      if (mealType === 'BREAKFAST') mealTimeStr = mealSettings?.breakfastTime || '08:00'
                      if (mealType === 'LUNCH') mealTimeStr = mealSettings?.lunchTime || '13:00'
                      if (mealType === 'DINNER') mealTimeStr = mealSettings?.dinnerTime || '20:00'
                      const [hours, minutes] = mealTimeStr.split(':').map(Number)
                      const mealTime = new Date(selectedDate)
                      mealTime.setHours(hours, minutes, 0, 0)
                      const mealTimePassed = isTodaySelected && now >= mealTime

                      return (
                        <div key={mealType} className="flex items-center justify-between p-3 sm:p-4 border rounded-xl bg-card hover:bg-accent/50 transition-colors gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-1.5 sm:p-2 rounded-full ${mealTypeColor} flex-shrink-0`}>
                              <span className="text-base sm:text-lg">{mealTypeIcon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm sm:text-base block">{mealType}</span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">{mealCount} total</Badge>
                                {hasMealSelected && (
                                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0.5 h-5">
                                    ✓ You're in
                                  </Badge>
                                )}
                                {shouldAutoAdd && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs px-1.5 py-0.5 h-5 flex items-center gap-0.5">
                                    <Zap className="h-2.5 w-2.5" />
                                    Auto
                                  </Badge>
                                )}
                                {isAutoTime && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs px-1.5 py-0.5 h-5 flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    Time
                                  </Badge>
                                )}
                                {mealTimePassed && (
                                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs px-1.5 py-0.5 h-5 flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    Time Passed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Button
                              variant={hasMealSelected ? 'destructive' : 'default'}
                              size="sm"
                              className="rounded-full px-3 sm:px-6 text-xs sm:text-sm h-8 sm:h-9"
                              onClick={() => handleToggleMeal(mealType)}
                              disabled={isLoading || (!hasMealSelected && !canAddMeal(selectedDate, mealType)) || !canEditMeal(mealType)}
                            >
                              {hasMealSelected ? (
                                <>
                                  <Minus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
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
        </div>
      </div>



      {/* Meal Settings Dialog */}
      <MealSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        mealSettings={mealSettings}
        updateMealSettings={updateMealSettings}
      />
      {/* Auto Meal Settings Dialog */}
      <AutoMealSettingsDialog
        open={autoSettingsOpen}
        onOpenChange={setAutoSettingsOpen}
        autoMealSettings={autoMealSettings}
        updateAutoMealSettings={updateAutoMealSettings}
      />
    </div>
  )
}
