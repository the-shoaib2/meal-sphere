"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { Loader2, Plus } from "lucide-react"
import { format, startOfMonth, endOfMonth, isToday, isSameDay } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMeal } from "@/hooks/use-meal"

import { Meal, MealType } from "@/hooks/use-meal"

interface MealWithUser extends Omit<Meal, 'user'> {
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface MealManagementProps {
  groupName?: string;
}

export default function MealManagement({ groupName }: MealManagementProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const isMobile = useIsMobile()
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("calendar")
  
  const { 
    meals, 
    isLoading, 
    getMealsByDate, 
    toggleMeal,
    hasMeal 
  } = useMeal()

  // Get meals for the selected date
  const mealsForDate = getMealsByDate(selectedDate) as MealWithUser[]

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

  // Check if current user has a meal of a specific type on the selected date
  const userHasMeal = (type: MealType) => {
    if (!session?.user?.id) return false
    return hasMeal(selectedDate, type as MealType)
  }

  // Render meal summary
  const renderMealSummary = () => {
    const mealsForDate = getMealsByDate(selectedDate)
    const breakfastCount = mealsForDate.filter((meal) => meal.type === "Breakfast").length
    const lunchCount = mealsForDate.filter((meal) => meal.type === "Lunch").length
    const dinnerCount = mealsForDate.filter((meal) => meal.type === "Dinner").length

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Breakfast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakfastCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lunch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lunchCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dinner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dinnerCount}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render meal list
  const renderMealList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )
    }

    if (mealsForDate.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No meals for this date</p>
        </div>
      )
    }

    // Group meals by type
    const mealsByType: Record<string, MealWithUser[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
    }

    mealsForDate.forEach((meal) => {
      mealsByType[meal.type].push(meal)
    })

    return (
      <div className="space-y-6">
        {Object.entries(mealsByType).map(([type, typeMeals]) => {
          if (typeMeals.length === 0) return null

          return (
            <div key={type} className="space-y-2">
              <h3 className="font-medium">{type.charAt(0) + type.slice(1).toLowerCase()}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {typeMeals.map((meal) => (
                  <div key={meal.id} className="flex items-center p-2 border rounded-md">
                    {meal.user.image ? (
                      <img
                        src={meal.user.image || "/placeholder.svg"}
                        alt={meal.user.name || undefined}
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
                        {meal.user.name?.charAt(0) || "U"}
                      </div>
                    )}
                    <span>{meal.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p>Please sign in to manage meals</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Button variant="outline" className="ml-auto" onClick={() => router.push("/dashboard/meals/guest")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Guest Meal
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">Meal List</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  Meals for {format(selectedDate, 'MMMM d, yyyy')}
                  {isToday(selectedDate) && ' (Today)'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between">
                      <span>Breakfast</span>
                      <Button
                        variant={userHasMeal('Breakfast' as MealType) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleMeal('Breakfast' as MealType)}
                        disabled={isLoading}
                      >
                        {userHasMeal('Breakfast' as MealType) ? 'Remove' : 'Add'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lunch</span>
                      <Button
                        variant={userHasMeal('Lunch' as MealType) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleMeal('Lunch' as MealType)}
                        disabled={isLoading}
                      >
                        {userHasMeal('Lunch' as MealType) ? 'Remove' : 'Add'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Dinner</span>
                      <Button
                        variant={userHasMeal('Dinner' as MealType) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleMeal('Dinner' as MealType)}
                        disabled={isLoading}
                      >
                        {userHasMeal('Dinner' as MealType) ? 'Remove' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {renderMealSummary()}
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Meals for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderMealList()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
