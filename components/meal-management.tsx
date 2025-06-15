"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { Loader2, Plus } from "lucide-react"
import { format, startOfMonth, endOfMonth, isToday, isSameDay } from "date-fns"
import { useIsMobile } from "@/hooks/use-mobile"

type Meal = {
  id: string
  userId: string
  roomId: string
  date: string
  type: "BREAKFAST" | "LUNCH" | "DINNER"
  user: {
    id: string
    name: string
    image: string
  }
}

type Room = {
  id: string
  name: string
}

export default function MealManagement() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("calendar")

  // Get the roomId from URL if available
  useEffect(() => {
    if (!searchParams) return;
    const roomId = searchParams.get("roomId")
    if (roomId) {
      setSelectedRoom(roomId)
    }
  }, [searchParams])

  // Fetch rooms
  useEffect(() => {
    if (!searchParams) return;
    
    const fetchRooms = async () => {
      try {
        const response = await fetch("/api/rooms")
        const data = await response.json()

        if (data.length > 0) {
          setRooms(data)
          if (!selectedRoom && !searchParams.get("roomId")) {
            setSelectedRoom(data[0].id)
          }
        }
      } catch (error) {
        console.error("Error fetching rooms:", error)
        toast.error("Failed to load rooms")
      }
    }

    fetchRooms()
  }, [searchParams, selectedRoom])

  // Fetch meals when room or date changes
  useEffect(() => {
    if (!selectedRoom) return

    const fetchMeals = async () => {
      setLoading(true)
      try {
        const startDate = format(startOfMonth(selectedDate), "yyyy-MM-dd")
        const endDate = format(endOfMonth(selectedDate), "yyyy-MM-dd")

        const response = await fetch(`/api/meals?roomId=${selectedRoom}&startDate=${startDate}&endDate=${endDate}`)

        if (!response.ok) {
          throw new Error("Failed to fetch meals")
        }

        const data = await response.json()
        setMeals(data)
      } catch (error) {
        console.error("Error fetching meals:", error)
        toast.error("Failed to load meals")
      } finally {
        setLoading(false)
      }
    }

    fetchMeals()
  }, [selectedRoom, selectedDate])

  // Handle room change
  const handleRoomChange = (roomId: string) => {
    setSelectedRoom(roomId)
    router.push(`/dashboard/meals?roomId=${roomId}`)
  }

  // Toggle meal
  const toggleMeal = async (type: "BREAKFAST" | "LUNCH" | "DINNER") => {
    if (!session?.user || !selectedRoom) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: selectedRoom,
          date: format(selectedDate, "yyyy-MM-dd"),
          type,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to toggle meal")
      }

      const data = await response.json()

      // Update meals list
      const mealExists = meals.some(
        (meal) => meal.userId === session.user.id && isSameDay(new Date(meal.date), selectedDate) && meal.type === type,
      )

      if (mealExists) {
        // Remove meal
        setMeals(
          meals.filter(
            (meal) =>
              !(meal.userId === session.user.id && isSameDay(new Date(meal.date), selectedDate) && meal.type === type),
          ),
        )
        toast.success("Meal removed")
      } else {
        // Add meal
        const newMeal = {
          id: data.id || Date.now().toString(),
          userId: session.user.id,
          roomId: selectedRoom,
          date: selectedDate.toISOString(),
          type,
          user: {
            id: session.user.id,
            name: session.user.name || "",
            image: session.user.image || "",
          },
        }
        setMeals([...meals, newMeal])
        toast.success("Meal added")
      }
    } catch (error) {
      console.error("Error toggling meal:", error)
      toast.error("Failed to update meal")
    } finally {
      setSubmitting(false)
    }
  }

  // Check if a meal is selected
  const isMealSelected = (type: "BREAKFAST" | "LUNCH" | "DINNER") => {
    if (!session?.user) return false

    return meals.some(
      (meal) => meal.userId === session.user.id && isSameDay(new Date(meal.date), selectedDate) && meal.type === type,
    )
  }

  // Get meals for the selected date
  const getMealsForDate = () => {
    return meals.filter((meal) => isSameDay(new Date(meal.date), selectedDate))
  }

  // Render meal summary
  const renderMealSummary = () => {
    const mealsForDate = getMealsForDate()
    const breakfastCount = mealsForDate.filter((meal) => meal.type === "BREAKFAST").length
    const lunchCount = mealsForDate.filter((meal) => meal.type === "LUNCH").length
    const dinnerCount = mealsForDate.filter((meal) => meal.type === "DINNER").length

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
    const mealsForDate = getMealsForDate()

    if (mealsForDate.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No meals for this date</p>
        </div>
      )
    }

    // Group meals by type
    const mealsByType: Record<string, Meal[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
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
                        alt={meal.user.name}
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
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium mb-1">Select Room</label>
          {rooms.length > 0 ? (
            <Select value={selectedRoom} onValueChange={handleRoomChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-muted-foreground">No rooms available. Please create or join a room first.</div>
          )}
        </div>

        <div className="w-full md:w-2/3">
          <Button variant="outline" className="ml-auto" onClick={() => router.push("/dashboard/meals/guest")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Guest Meal
          </Button>
        </div>
      </div>

      {selectedRoom && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
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
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-md border"
                      disabled={{ before: new Date(2020, 0, 1) }}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Meals for {format(selectedDate, "MMMM d, yyyy")}
                    {isToday(selectedDate) && " (Today)"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-between">
                          <span>Breakfast</span>
                          <Button
                            variant={isMealSelected("BREAKFAST") ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMeal("BREAKFAST")}
                            disabled={submitting}
                          >
                            {isMealSelected("BREAKFAST") ? "Remove" : "Add"}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Lunch</span>
                          <Button
                            variant={isMealSelected("LUNCH") ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMeal("LUNCH")}
                            disabled={submitting}
                          >
                            {isMealSelected("LUNCH") ? "Remove" : "Add"}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Dinner</span>
                          <Button
                            variant={isMealSelected("DINNER") ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMeal("DINNER")}
                            disabled={submitting}
                          >
                            {isMealSelected("DINNER") ? "Remove" : "Add"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {renderMealSummary()}
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Meals for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
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
      )}
    </div>
  )
}
