"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "react-hot-toast"
import { Plus, Settings, Clock, Users, Calendar as CalendarIcon, Utensils, Minus, Zap } from "lucide-react"
import { format, startOfMonth, endOfMonth, isToday, isSameDay, addDays, subDays, eachDayOfInterval } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMeal, type MealType } from "@/hooks/use-meal"
import { useGroupAccess } from "@/hooks/use-group-access"
import { useCurrentPeriod } from "@/hooks/use-periods"
import { canEditMealsForDate, isPeriodLocked } from "@/lib/period-utils"
import GuestMealForm from "@/components/meal/guest-meal-form"
import GuestMealManager from "@/components/meal/guest-meal-manager"
import MealCalendar from "@/components/meal/meal-calendar"
import { MealCardSkeleton, MealListSkeleton, UserMealSummarySkeleton, MealManagementSkeleton } from "@/components/meal/meal-skeletons";
import MealSummary from "@/components/meal/meal-summary"
import type { ReadonlyURLSearchParams } from "next/navigation"
import { PeriodStatusCard } from "@/components/periods/period-status-card"
import MealSettingsDialog from "@/components/meal/meal-settings-dialog";
import AutoMealSettingsDialog from "@/components/meal/auto-meal-settings-dialog";

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
}

export default function MealManagement({ roomId, groupName, searchParams: propSearchParams }: MealManagementProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const searchParams = propSearchParams || useSearchParams()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Get the active tab from URL search params, default to 'calendar'
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams?.get('tab');
    return tabFromUrl && ['calendar', 'list'].includes(tabFromUrl)
      ? tabFromUrl
      : 'calendar';
  });

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [autoSettingsOpen, setAutoSettingsOpen] = useState(false)

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.push(`/meals?${params.toString()}`, { scroll: false });
  };

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && ['calendar', 'list'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Check user permissions
  const { userRole, isMember, isLoading: isAccessLoading } = useGroupAccess({ groupId: roomId })

  // Get current period
  const { data: currentPeriod, isLoading: isPeriodLoading } = useCurrentPeriod()

  // Check if user can manage meal settings (only when not loading)
  const canManageMealSettings = !isAccessLoading && userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)

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
    toggleMeal,
    updateMealSettings,
    updateAutoMealSettings,
    hasMeal,
    canAddMeal,
    triggerAutoMeals,
    shouldAutoAddMeal,
    isAutoMealTime
  } = useMeal(roomId)



  // Header (always visible)
  const header = (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meal Management</h1>
        <div className="text-muted-foreground">
          Manage meals for {groupName || "your group"}
          {userRole && (
            <span className="ml-2">
              • <Badge variant={canManageMealSettings ? "default" : "outline"} className="text-xs">{userRole}</Badge>
            </span>
          )}
          {currentPeriod && (
            <span className="ml-2">
              • <Badge variant={isPeriodLocked(currentPeriod) ? "destructive" : "default"} className="text-xs">
                {currentPeriod.name} {isPeriodLocked(currentPeriod) ? "(Locked)" : ""}
              </Badge>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <GuestMealForm roomId={roomId} onSuccess={() => { }} />
        {canManageMealSettings && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="Meal Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAutoSettingsOpen(true)}
          title="Auto Meal Settings"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // If there is no period, show only the PeriodStatusCard below the header
  if (!currentPeriod && !isPeriodLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Period</h2>
          <p className="text-muted-foreground mb-4">
            There is no period for this group.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state if access, period, or user stats is still loading
  if (isLoading || isAccessLoading || isPeriodLoading || isLoadingUserStats) {
    return <MealManagementSkeleton />;
  }

  // Show error state if user doesn't have access to the group
  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You don't have access to manage meals for this group.
        </p>
        <Button onClick={() => router.push('/groups')}>
          Go to Groups
        </Button>
      </div>
    )
  }

  // Get meals for the selected date
  const mealsForDate = useMealsByDate(selectedDate) as MealWithUser[]
  const guestMealsForDate = useGuestMealsByDate(selectedDate)

  // Handle toggling a meal
  const handleToggleMeal = async (type: MealType) => {
    if (!session?.user?.id) return

    try {
      await toggleMeal(selectedDate, type, session.user.id)
    } catch (error) {
      console.error("Error toggling meal:", error)
      toast.error("Failed to update meal")
    }
  }

  // Handle triggering auto meals
  const handleTriggerAutoMeals = async () => {
    try {
      await triggerAutoMeals(selectedDate)
    } catch (error) {
      console.error("Error triggering auto meals:", error)
      toast.error("Failed to trigger auto meals")
    }
  }

  // Check if current user has a meal of a specific type on the selected date
  const userHasMeal = (type: MealType) => {
    if (!session?.user?.id) return false
    return hasMeal(selectedDate, type, session.user.id)
  }

  // Check if auto meal should be added for current user
  const shouldAutoAddForUser = (type: MealType) => {
    return shouldAutoAddMeal(selectedDate, type)
  }

  // Check if it's auto meal time for a specific meal type
  const isAutoTimeForMeal = (type: MealType) => {
    return isAutoMealTime(selectedDate, type)
  }

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


  // Render meal list
  const renderMealList = () => {

    const allMeals = [...mealsForDate, ...guestMealsForDate]

    if (allMeals.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Utensils className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium text-lg">No meals scheduled</p>
          <p className="text-sm text-muted-foreground">Add meals for this date to see them here</p>
        </div>
      )
    }

    // Group meals by type
    const mealsByType: Record<string, (MealWithUser | any)[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
    }

    mealsForDate.forEach((meal) => {
      mealsByType[meal.type].push(meal)
    })

    guestMealsForDate.forEach((guestMeal) => {
      mealsByType[guestMeal.type].push(guestMeal)
    })

    return (
      <div className="space-y-6">
        {Object.entries(mealsByType).map(([type, typeMeals]) => {
          if (typeMeals.length === 0) return null

          const mealTypeIcon = type === 'BREAKFAST' ? '🌅' : type === 'LUNCH' ? '☀️' : '🌙'
          const totalMeals = typeMeals.reduce((sum, meal) => sum + (meal.count || 1), 0)

          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b">
                <span className="text-lg">{mealTypeIcon}</span>
                <h3 className="font-semibold text-base">{type.charAt(0) + type.slice(1).toLowerCase()}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {totalMeals} total
                </Badge>
              </div>

              <div className="space-y-2">
                {typeMeals.map((meal: any) => (
                  <div key={meal.id} className="group flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={meal.user.image} alt={meal.user.name || undefined} />
                        <AvatarFallback className="text-xs">
                          {meal.user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{meal.user.name}</p>
                        {meal.count && (
                          <p className="text-xs text-muted-foreground">
                            {meal.count} guest meal{meal.count > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {meal.count && (
                        <Badge variant="outline" className="text-xs">
                          ×{meal.count}
                        </Badge>
                      )}
                      {meal.userId === session?.user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleMeal(type as MealType)}
                          disabled={isLoading}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Helper: check if user can edit meal for a type (not after meal time unless privileged)
  const canEditMeal = (type: MealType) => {
    if (!session?.user?.id) return false

    // Check if period is locked
    if (isPeriodLocked(currentPeriod)) {
      return false
    }

    // Check if date is within current period
    if (!canEditMealsForDate(selectedDate, currentPeriod)) {
      return false
    }

    // Only allow edit if current time is before meal time, or user is admin/manager/meal manager
    const now = new Date()
    let mealTimeStr = ''
    if (type === 'BREAKFAST') mealTimeStr = mealSettings?.breakfastTime || '08:00'
    if (type === 'LUNCH') mealTimeStr = mealSettings?.lunchTime || '13:00'
    if (type === 'DINNER') mealTimeStr = mealSettings?.dinnerTime || '20:00'
    const [h, m] = mealTimeStr.split(':').map(Number)
    const mealTime = new Date(selectedDate)
    mealTime.setHours(h, m, 0, 0)
    const privileged = userRole && ['ADMIN', 'MEAL_MANAGER', 'MANAGER'].includes(userRole)
    return privileged || now < mealTime
  }


  return (
    <div className="space-y-6">
      {header}

      {/* User Meal Summary */}
      <MealSummary
        selectedDate={selectedDate}
        useMealCount={useMealCount}
      />


      {/* Meal Calendar and List */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">

        {/* Tabs for Calendar and List */}
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">Meal List</TabsTrigger>
        </TabsList>

        {/* Meal Calendar */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <MealCalendar
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  getMealCount={(date: Date) => useMealCount(date, 'BREAKFAST') + useMealCount(date, 'LUNCH') + useMealCount(date, 'DINNER')}
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
                    {isLoading ? (
                      // Skeleton for meal cards
                      (['BREAKFAST', 'LUNCH', 'DINNER'] as MealType[]).map((mealType) => (
                        <MealCardSkeleton key={mealType} />
                      ))
                    ) : (
                      (['BREAKFAST', 'LUNCH', 'DINNER'] as MealType[]).map((mealType) => {
                        const hasMealSelected = userHasMeal(mealType)
                        const mealCount = useMealCount(selectedDate, mealType)
                        const mealTypeIcon = mealType === 'BREAKFAST' ? '🌅' : mealType === 'LUNCH' ? '☀️' : '🌙'
                        const mealTypeColor = mealType === 'BREAKFAST' ? 'bg-orange-100 text-orange-700' :
                          mealType === 'LUNCH' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                        const shouldAutoAdd = shouldAutoAddForUser(mealType)
                        const isAutoTime = isAutoTimeForMeal(mealType)

                        return (
                          <div key={mealType} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-xl bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-0">
                              <div className={`p-1.5 sm:p-2 rounded-full ${mealTypeColor} flex-shrink-0`}>
                                <span className="text-base sm:text-lg">{mealTypeIcon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-sm sm:text-base block">{mealType}</span>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs sm:text-sm">{mealCount} total</Badge>
                                  {hasMealSelected && (
                                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 text-xs sm:text-sm">
                                      ✓ You're in
                                    </Badge>
                                  )}
                                  {shouldAutoAdd && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs sm:text-sm flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      Auto
                                    </Badge>
                                  )}
                                  {isAutoTime && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs sm:text-sm flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Time
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end sm:justify-start">
                              <Button
                                variant={hasMealSelected ? 'destructive' : 'default'}
                                size="sm"
                                className="rounded-full px-4 sm:px-6 text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
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

          {/* User Meal Summary */}
          <MealSummary
            selectedDate={selectedDate}
            useMealCount={useMealCount}

          />
        </TabsContent>

        {/* Meal List */}
        <TabsContent value="list">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>All Meals for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <MealListSkeleton />
                ) : (
                  renderMealList()
                )}
              </CardContent>
            </Card>

            <GuestMealManager
              roomId={roomId}
              date={selectedDate}
              onUpdate={() => {
                // Trigger a refresh of the meal data
                queryClient.invalidateQueries({ queryKey: ['guest-meals', roomId] });
                queryClient.invalidateQueries({ queryKey: ['meal-summary', roomId] });
                queryClient.invalidateQueries({ queryKey: ['user-meal-stats', roomId, session?.user?.id] });
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

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
