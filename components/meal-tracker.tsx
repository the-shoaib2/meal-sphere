"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { format, isSameDay, startOfWeek, addDays, eachDayOfInterval } from "date-fns"
import { Calendar as CalendarIcon, Utensils, CalendarDays, Users, Check, Clock, Zap } from "lucide-react"
import { useMeal, type MealType } from "@/hooks/use-meal"

// Define the meal types as const to preserve literal types
const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"]

// Type for the meal types
type MealTypeValue = MealType

// Type guard to check if a string is a valid MealType
function isMealType(value: string): value is MealTypeValue {
  return (MEAL_TYPES as readonly string[]).includes(value)
}

interface MealTrackerProps {
  roomId: string
}

export default function MealTracker({ roomId }: MealTrackerProps) {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()))
  
  const {
    meals,
    guestMeals,
    mealSettings,
    autoMealSettings,
    isLoading,
    hasMeal,
    toggleMeal,
    useMealCount,
    updateAutoMealSettings,
    triggerAutoMeals,
    shouldAutoAddMeal,
    isAutoMealTime
  } = useMeal(roomId)

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy")
  }

  // Get week days for the current week
  const getWeekDays = (startDate: Date) => {
    return eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) })
  }
  
  // Get meals for the selected date
  const todaysMeals = useMealCount(selectedDate, 'BREAKFAST') + 
                     useMealCount(selectedDate, 'LUNCH') + 
                     useMealCount(selectedDate, 'DINNER')

  // Get the current week's days
  const weekDays = getWeekDays(weekStart)
  
  // Toggle meal selection
  const handleMealToggle = async (mealType: MealTypeValue) => {
    if (!session?.user?.id) return
    try {
      await toggleMeal(selectedDate, mealType, session.user.id)
    } catch (error) {
      console.error("Failed to toggle meal:", error)
    }
  }

  // Handle triggering auto meals
  const handleTriggerAutoMeals = async () => {
    try {
      await triggerAutoMeals(selectedDate)
    } catch (error) {
      console.error("Error triggering auto meals:", error)
    }
  }
  
  // Safely handle meal type selection
  const handleMealTypeClick = (mealType: string) => {
    if (isMealType(mealType)) {
      handleMealToggle(mealType)
    }
  }

  // Handle auto meal settings
  const handleAutoMealToggle = (mealType: MealTypeValue, enabled: boolean) => {
    if (!autoMealSettings) return
    
    const updates: any = {}
    if (mealType === 'BREAKFAST') updates.breakfastEnabled = enabled
    if (mealType === 'LUNCH') updates.lunchEnabled = enabled
    if (mealType === 'DINNER') updates.dinnerEnabled = enabled
    
    updateAutoMealSettings(updates)
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="h-6 w-6" />
          Meal Tracker
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Auto: {autoMealSettings?.isEnabled ? 'On' : 'Off'}
          </Badge>
          {mealSettings?.autoMealEnabled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTriggerAutoMeals}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Auto Add
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Weekly Overview
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: All Meals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Meals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {MEAL_TYPES.map((mealType) => {
                    const hasMealSelected = hasMeal(selectedDate, mealType)
                    const mealCount = useMealCount(selectedDate, mealType)
                    const shouldAutoAdd = shouldAutoAddMeal(selectedDate, mealType)
                    const isAutoTime = isAutoMealTime(selectedDate, mealType)
                    
                    return (
                      <div 
                        key={mealType}
                        className="p-3 rounded-lg border flex items-center justify-between hover:bg-accent cursor-pointer"
                        onClick={() => handleMealToggle(mealType)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{mealType}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{mealCount}</Badge>
                            {shouldAutoAdd && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Auto
                              </Badge>
                            )}
                            {isAutoTime && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Time
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            hasMealSelected 
                              ? 'bg-primary border-primary' 
                              : 'border-gray-300'
                          }`}>
                            {hasMealSelected && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Column 2: Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    today: (date) => isSameDay(date, new Date()),
                    hasMeals: (date) => {
                      const breakfast = useMealCount(date, 'BREAKFAST')
                      const lunch = useMealCount(date, 'LUNCH')
                      const dinner = useMealCount(date, 'DINNER')
                      return breakfast > 0 || lunch > 0 || dinner > 0
                    }
                  }}
                  modifiersStyles={{
                    hasMeals: { backgroundColor: 'hsl(var(--primary) / 0.1)' }
                  }}
                />
                <div className="mt-4 space-y-2">
                  <h3 className="font-medium">This Week</h3>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {weekDays.map((day) => (
                      <div 
                        key={day.toString()}
                        className={`p-2 rounded-md cursor-pointer text-sm ${
                          isSameDay(day, selectedDate) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div>{format(day, 'EEE')}</div>
                        <div className="font-medium">{format(day, 'd')}</div>
                        <div className="text-xs">
                          {useMealCount(day, 'BREAKFAST') + useMealCount(day, 'LUNCH') + useMealCount(day, 'DINNER')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Column 3: Meals for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MEAL_TYPES.map((mealType) => {
                    const hasMealSelected = hasMeal(selectedDate, mealType)
                    const mealCount = useMealCount(selectedDate, mealType)
                    const shouldAutoAdd = shouldAutoAddMeal(selectedDate, mealType)
                    const isAutoTime = isAutoMealTime(selectedDate, mealType)
                    
                    return (
                      <div key={mealType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{mealType}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{mealCount}</Badge>
                              {shouldAutoAdd && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  Auto
                                </Badge>
                              )}
                              {isAutoTime && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Time
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={hasMealSelected ? 'destructive' : 'default'}
                              size="sm"
                              onClick={() => handleMealTypeClick(mealType)}
                            >
                              {hasMealSelected ? 'Remove' : 'Add'}
                            </Button>
                          </div>
                        </div>
                        {hasMealSelected && (
                          <div className="bg-accent/50 p-3 rounded-md">
                            <p className="text-sm">Meal is scheduled for {format(selectedDate, 'MMMM d')}.</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Auto Meal Settings</CardTitle>
            </CardHeader>
            <CardContent>
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
                
                <div className="space-y-3">
                  <Label>Meal Types</Label>
                  {MEAL_TYPES.map((mealType) => (
                    <div key={mealType} className="flex items-center justify-between">
                      <Label className="text-sm">{mealType}</Label>
                      <Switch
                        checked={
                          mealType === 'BREAKFAST' ? autoMealSettings?.breakfastEnabled :
                          mealType === 'LUNCH' ? autoMealSettings?.lunchEnabled :
                          autoMealSettings?.dinnerEnabled
                        }
                        onCheckedChange={(checked) => handleAutoMealToggle(mealType, checked)}
                        disabled={!autoMealSettings?.isEnabled}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
