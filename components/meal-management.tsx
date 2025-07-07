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
import MealCardSkeleton from "@/components/meal/meal-card-skeleton"
import MealListSkeleton from "@/components/meal/meal-list-skeleton"
import UserMealSummarySkeleton from "@/components/meal/user-meal-summary-skeleton"
import MealSummary from "@/components/meal/meal-summary"
import type { ReadonlyURLSearchParams } from "next/navigation"
import { PeriodStatusCard } from "@/components/periods/period-status-card"

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
        <GuestMealForm roomId={roomId} onSuccess={() => {}} />
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
        <PeriodStatusCard />
          </div>
    );
  }

  // Show loading state if access, period, or user stats is still loading
  if (isAccessLoading || isPeriodLoading || isLoadingUserStats) {
    return (
      <div className="space-y-6">
        <UserMealSummarySkeleton />
        <div className="space-y-4">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-full max-w-md">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MealCardSkeleton />
                  <MealCardSkeleton />
                  <MealCardSkeleton />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
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

  // Render meal summary
  const renderMealSummary = () => {
    const breakfastCount = useMealCount(selectedDate, 'BREAKFAST')
    const lunchCount = useMealCount(selectedDate, 'LUNCH')
    const dinnerCount = useMealCount(selectedDate, 'DINNER')
    const totalMeals = breakfastCount + lunchCount + dinnerCount

    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-full">
              <Utensils className="h-4 w-4 text-primary" />
            </div>
            Meal Summary
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalMeals} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center space-y-1 p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm sm:text-base">🌅</span>
                <span className="text-xs font-medium text-orange-700 hidden sm:inline">Breakfast</span>
                <span className="text-xs font-medium text-orange-700 sm:hidden">B</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-orange-800">{breakfastCount}</div>
            </div>
            <div className="text-center space-y-1 p-2 sm:p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-x border-border">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm sm:text-base">☀️</span>
                <span className="text-xs font-medium text-yellow-700 hidden sm:inline">Lunch</span>
                <span className="text-xs font-medium text-yellow-700 sm:hidden">L</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-yellow-800">{lunchCount}</div>
            </div>
            <div className="text-center space-y-1 p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm sm:text-base">🌙</span>
                <span className="text-xs font-medium text-blue-700 hidden sm:inline">Dinner</span>
                <span className="text-xs font-medium text-blue-700 sm:hidden">D</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-blue-800">{dinnerCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render user meal summary
  const renderUserMealSummary = () => {
    if (!userMealStats) {
      return (
        <Card className="mb-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <span className="hidden sm:inline">Your Meal Summary</span>
              <span className="sm:hidden">Your Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center py-8">
              <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No Active Period</p>
              <p className="text-sm text-muted-foreground">Meal statistics are only available during active periods</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    const { totals, byType } = userMealStats
    const currentMonth = format(new Date(), 'MMMM yyyy')

    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <span className="hidden sm:inline">Your Meal Summary - {currentMonth}</span>
            <span className="sm:hidden">Your Summary</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {totals.total} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Total Meals */}
            <div className="text-center space-y-1 p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs">📊</span>
                <span className="text-xs font-medium text-blue-700 hidden sm:inline">Total</span>
                <span className="text-xs font-medium text-blue-700 sm:hidden">T</span>
              </div>
              <div className="text-lg font-bold text-blue-800">{totals.total}</div>
              <div className="text-xs text-blue-600 hidden sm:block">
                {totals.regularMeals} + {totals.guestMeals}
              </div>
            </div>

            {/* Breakfast */}
            <div className="text-center space-y-1 p-2 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs">🌅</span>
                <span className="text-xs font-medium text-orange-700 hidden sm:inline">Breakfast</span>
                <span className="text-xs font-medium text-orange-700 sm:hidden">B</span>
              </div>
              <div className="text-lg font-bold text-orange-800">{byType.breakfast.total}</div>
              <div className="text-xs text-orange-600 hidden sm:block">
                {byType.breakfast.regular} + {byType.breakfast.guest}
              </div>
            </div>

            {/* Lunch */}
            <div className="text-center space-y-1 p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs">☀️</span>
                <span className="text-xs font-medium text-yellow-700 hidden sm:inline">Lunch</span>
                <span className="text-xs font-medium text-yellow-700 sm:hidden">L</span>
              </div>
              <div className="text-lg font-bold text-yellow-800">{byType.lunch.total}</div>
              <div className="text-xs text-yellow-600 hidden sm:block">
                {byType.lunch.regular} + {byType.lunch.guest}
              </div>
            </div>

            {/* Dinner */}
            <div className="text-center space-y-1 p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs">🌙</span>
                <span className="text-xs font-medium text-blue-700 hidden sm:inline">Dinner</span>
                <span className="text-xs font-medium text-blue-700 sm:hidden">D</span>
              </div>
              <div className="text-lg font-bold text-blue-800">{byType.dinner.total}</div>
              <div className="text-xs text-blue-600 hidden sm:block">
                {byType.dinner.regular} + {byType.dinner.guest}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render meal list
  const renderMealList = () => {
    if (isLoading) {
      return <MealListSkeleton />
    }

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
                        <AvatarImage src={meal.user.image || "/placeholder.svg"} alt={meal.user.name || undefined} />
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

  // Render meal settings dialog
  const renderMealSettings = () => (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Meal Settings</DialogTitle>
          <DialogDescription>
            Configure meal times and settings for the group
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Breakfast Time</Label>
              <Input
                type="time"
                value={mealSettings?.breakfastTime || "08:00"}
                onChange={(e) => updateMealSettings({ breakfastTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lunch Time</Label>
              <Input
                type="time"
                value={mealSettings?.lunchTime || "13:00"}
                onChange={(e) => updateMealSettings({ lunchTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dinner Time</Label>
              <Input
                type="time"
                value={mealSettings?.dinnerTime || "20:00"}
                onChange={(e) => updateMealSettings({ dinnerTime: e.target.value })}
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Meal System</Label>
                <p className="text-sm text-muted-foreground">
                  Enable automatic meal scheduling
                </p>
              </div>
              <Switch
                checked={mealSettings?.autoMealEnabled || false}
                onCheckedChange={(checked) => updateMealSettings({ autoMealEnabled: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Guest Meals</Label>
                <p className="text-sm text-muted-foreground">
                  Allow members to add guest meals
                </p>
              </div>
              <Switch
                checked={mealSettings?.allowGuestMeals || true}
                onCheckedChange={(checked) => updateMealSettings({ allowGuestMeals: checked })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Meals Per Day</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={mealSettings?.maxMealsPerDay || 3}
                onChange={(e) => updateMealSettings({ maxMealsPerDay: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Guest Meal Limit</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={mealSettings?.guestMealLimit || 5}
                onChange={(e) => updateMealSettings({ guestMealLimit: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // Render auto meal settings dialog
  const renderAutoMealSettings = () => (
    <Dialog open={autoSettingsOpen} onOpenChange={setAutoSettingsOpen}>
      <DialogContent className="sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Auto Meal Settings</DialogTitle>
          <DialogDescription>
            Configure your automatic meal preferences
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto Meals</Label>
              <p className="text-sm text-muted-foreground">
                Automatically add meals based on your schedule
              </p>
            </div>
            <Switch
              checked={autoMealSettings?.isEnabled || false}
              onCheckedChange={(checked) => updateAutoMealSettings({ isEnabled: checked })}
            />
          </div>
          <Separator />
          {autoMealSettings?.isEnabled && (
            <div className="space-y-3">
              <Label>Meal Types</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Breakfast</Label>
                  <Switch
                    checked={autoMealSettings?.breakfastEnabled ?? true}
                    onCheckedChange={(checked) => updateAutoMealSettings({ breakfastEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Lunch</Label>
                  <Switch
                    checked={autoMealSettings?.lunchEnabled ?? true}
                    onCheckedChange={(checked) => updateAutoMealSettings({ lunchEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Dinner</Label>
                  <Switch
                    checked={autoMealSettings?.dinnerEnabled ?? true}
                    onCheckedChange={(checked) => updateAutoMealSettings({ dinnerEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto Guest Meal</Label>
                  <Switch
                    checked={autoMealSettings?.guestMealEnabled ?? false}
                    onCheckedChange={(checked) => updateAutoMealSettings({ guestMealEnabled: checked })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">Meal List</TabsTrigger>
        </TabsList>

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
          {renderMealSummary()}
        </TabsContent>

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

      {renderMealSettings()}
      {renderAutoMealSettings()}
    </div>
  )
}
