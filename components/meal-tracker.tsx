"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isSameDay, startOfWeek, addDays } from "date-fns"
import { Calendar as CalendarIcon, Utensils, CalendarDays, Users, Check } from "lucide-react"
import { useMeal, type MealType } from "@/hooks/use-meal"

// Define the meal types as const to preserve literal types
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"] as const

// Type for the meal types
type MealTypeValue = typeof MEAL_TYPES[number]

// Type guard to check if a string is a valid MealType
function isMealType(value: string): value is MealTypeValue {
  return (MEAL_TYPES as readonly string[]).includes(value)
}

export default function MealTracker() {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()))
  
  const {
    meals,
    isLoading,
    hasMeal,
    toggleMeal,
    getMealsByDate
  } = useMeal()

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy")
  }

  // Get week days for the current week
  const getWeekDays = (startDate: Date) => {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  }
  
  // Get meals for the selected date
  const todaysMeals = getMealsByDate(selectedDate)

  // Get the current week's days
  const weekDays = getWeekDays(weekStart) as Date[]
  
  // Toggle meal selection
  const handleMealToggle = async (mealType: MealTypeValue) => {
    if (!session?.user?.id) return
    try {
      await toggleMeal(selectedDate, mealType as MealType, session.user.id)
    } catch (error) {
      console.error("Failed to toggle meal:", error)
    }
  }
  
  // Safely handle meal type selection
  const handleMealTypeClick = (mealType: string) => {
    if (isMealType(mealType)) {
      handleMealToggle(mealType)
    }
  }
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="h-6 w-6" />
          Meal Tracker
        </h1>
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
                  {MEAL_TYPES.map((mealType) => (
                    <div 
                      key={mealType}
                      className="p-3 rounded-lg border flex items-center justify-between hover:bg-accent cursor-pointer"
                      onClick={() => handleMealToggle(mealType)}
                    >
                      <span>{mealType}</span>
                      <input 
                        type="checkbox" 
                        checked={hasMeal(selectedDate, mealType)}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
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
                    return (
                      <div key={mealType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{mealType}</h3>
                          <Button
                            variant={hasMealSelected ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => handleMealTypeClick(mealType)}
                          >
                            {hasMealSelected ? 'Remove' : 'Add'}
                          </Button>
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
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Calendar view coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
