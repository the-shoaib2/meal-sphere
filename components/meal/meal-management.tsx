"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { Settings, Clock, ShieldCheck, Zap } from "lucide-react"
import { RoleBadge } from "@/components/shared/role-badge"
import { format, isToday, isSameDay } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMeal, type MealType, type MealsPageData } from "@/hooks/use-meal"
import { useGroupAccess } from "@/hooks/use-group-access"
import { useCurrentPeriod } from "@/hooks/use-periods"
import { isPeriodLocked } from "@/lib/utils/period-utils-shared"
import GuestMealManager from "@/components/meal/guest-meal-manager"
import MealSummary from "@/components/meal/meal-summary"
import type { ReadonlyURLSearchParams } from "next/navigation"
import MealSettingsDialog from "@/components/meal/meal-settings-dialog";
import AutoMealSettingsDialog from "@/components/meal/auto-meal-settings-dialog";
import { PageHeader } from "@/components/shared/page-header";
import MealCalendarCard from "@/components/meal/meal-calendar-card"
import DailyMealManagerCard from "@/components/meal/daily-meal-manager-card"
import AllMealsCard from "@/components/meal/all-meals-card"




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

    // Update URL without triggering RSC payload (Shallow route)
    const currentParams = typeof searchParams?.get === 'function'
      ? searchParams.toString()
      : (searchParams || {});
    const params = new URLSearchParams(currentParams as any);
    params.set('date', format(date, 'yyyy-MM-dd'));
    window.history.pushState(null, '', `?${params.toString()}`);
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
    deleteGuestMeal,
    isTogglingMeal
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

  const getMealCountForCalendar = useCallback((date: Date) => {
    return useMealCount(date, 'BREAKFAST') + useMealCount(date, 'LUNCH') + useMealCount(date, 'DINNER')
  }, [useMealCount])

  const header = (
    <PageHeader
      heading="Meals"
      badgesNextToTitle={true}
      collapsible={false}
      description={
        <div className="flex flex-col gap-1.5">
          <div className="flex sm:hidden flex-wrap items-center gap-1.5">
            {mealSettings?.autoMealEnabled && (
              <Badge
                variant="outline"
                className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 shadow-sm transition-all cursor-default uppercase tracking-widest text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5 shrink-0"
              >
                <Zap className="h-3 w-3 fill-emerald-500" />
                Auto meals
              </Badge>
            )}
            {currentPeriod && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest shadow-sm transition-all shrink-0 flex items-center gap-1.5 cursor-default",
                  isPeriodLocked(currentPeriod)
                    ? "bg-stone-50 text-stone-600 border-stone-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                )}
              >
                {!isPeriodLocked(currentPeriod) && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                {currentPeriod.name} {isPeriodLocked(currentPeriod) ? "• Locked" : "• Active"}
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground/90 font-medium text-sm">
            Track and manage your meals for <span className="text-foreground font-semibold">{groupName || "your group"}</span>
          </span>
        </div>
      }
      badges={
        <div className="flex items-center gap-2">
          <RoleBadge role={userRole} />
          <div className="hidden sm:flex items-center gap-2">
            {mealSettings?.autoMealEnabled && (
              <Badge
                variant="outline"
                className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 shadow-sm transition-all cursor-default uppercase tracking-widest text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5 shrink-0"
              >
                <Zap className="h-3 w-3 fill-emerald-500" />
                Auto meals
              </Badge>
            )}
            {currentPeriod && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest shadow-sm transition-all shrink-0 flex items-center gap-1.5 cursor-default",
                  isPeriodLocked(currentPeriod)
                    ? "bg-stone-50 text-stone-600 border-stone-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                )}
              >
                {!isPeriodLocked(currentPeriod) && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                {currentPeriod.name} {isPeriodLocked(currentPeriod) ? "• Locked" : "• Active"}
              </Badge>
            )}
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">

        {canManageMealSettings && (
          <Button
            variant="outline"

            className="h-9 w-9 shrink-0 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all shadow-sm"
            onClick={() => setSettingsOpen(true)}
            title="Meal Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        {canAccessAutoMealSettings && (
          <Button
            variant="outline"

            className="h-9 w-9 shrink-0 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all shadow-sm"
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
          <MealCalendarCard
            selectedDate={selectedDate}
            onSelect={handleDateSelect}
            getMealCount={getMealCountForCalendar}
            isLoading={isAnyLoading}
          />
          <DailyMealManagerCard
            roomId={roomId}
            selectedDate={selectedDate}
            isLoading={isAnyLoading}
            mealSettings={mealSettings}
            userHasMeal={userHasMeal}
            getUserMealCount={getUserMealCount}
            getUserGuestMealCount={getUserGuestMealCount}
            shouldAutoAddForUser={shouldAutoAddForUser}
            isAutoTimeForMeal={isAutoTimeForMeal}
            canEditMeal={canEditMeal}
            canAddMeal={canAddMeal}
            handleToggleMeal={handleToggleMeal}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isPrivileged && (
          <AllMealsCard
            selectedDate={selectedDate}
            mealsForDate={mealsForDate}
            guestMealsForDate={guestMealsForDate}
            currentUserId={session?.user?.id}
            isLoading={isAnyLoading}
            userRole={userRole}
            handleToggleMeal={handleToggleMeal}
            handleDeleteGuestMeal={handleDeleteGuestMeal}
          />
        )}
        <GuestMealManager
          roomId={roomId}
          date={selectedDate}
          initialData={initialData}
          isLoading={isAnyLoading}
          canEdit={canEditGuestMeals}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['group-balances', roomId] });
            queryClient.invalidateQueries({ queryKey: ['user-balance', roomId, session?.user?.id] });
          }}
        />
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
