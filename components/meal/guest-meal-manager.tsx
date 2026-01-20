"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Minus, Trash2, Users, Save, Check } from "lucide-react"
import { format } from "date-fns"
import { useMeal, type MealType } from "@/hooks/use-meal"
import { toast } from "react-hot-toast"

interface GuestMealManagerProps {
  roomId: string
  date: Date
  onUpdate?: () => void
  initialData?: any
}

export default function GuestMealManager({ roomId, date, onUpdate, initialData }: GuestMealManagerProps) {
  const { data: session } = useSession()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map())
  const [savedStates, setSavedStates] = useState<Map<string, boolean>>(new Map())

  const {
    guestMeals,
    getUserGuestMeals,
    updateGuestMeal,
    deleteGuestMeal,
    mealSettings,
    isLoading
  } = useMeal(roomId, initialData)

  const userGuestMeals = getUserGuestMeals(date)
  const guestMealLimit = mealSettings?.guestMealLimit || 10

  // Auto-save changes after a delay
  useEffect(() => {
    const timeouts = new Map<string, NodeJS.Timeout>()

    pendingChanges.forEach((newCount, guestMealId) => {
      // Clear existing timeout for this meal
      if (timeouts.has(guestMealId)) {
        clearTimeout(timeouts.get(guestMealId)!)
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        setIsUpdating(guestMealId)
        try {
          await updateGuestMeal(guestMealId, newCount)
          setSavedStates(prev => new Map(prev).set(guestMealId, true))
          onUpdate?.()

          // Clear saved state after 2 seconds
          setTimeout(() => {
            setSavedStates(prev => {
              const newMap = new Map(prev)
              newMap.delete(guestMealId)
              return newMap
            })
          }, 2000)
        } catch (error) {
          console.error("Error updating guest meal:", error)
          toast.error("Failed to update guest meal")
        } finally {
          setIsUpdating(null)
        }

        // Remove from pending changes
        setPendingChanges(prev => {
          const newMap = new Map(prev)
          newMap.delete(guestMealId)
          return newMap
        })
      }, 1000) // 1 second delay

      timeouts.set(guestMealId, timeout)
    })

    // Cleanup timeouts
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [pendingChanges, updateGuestMeal, onUpdate])

  const handleCountChange = (guestMealId: string, newCount: number) => {
    if (newCount < 1 || newCount > guestMealLimit) return

    setPendingChanges(prev => new Map(prev).set(guestMealId, newCount))
    setSavedStates(prev => new Map(prev).set(guestMealId, false))
  }

  const handleDelete = async (guestMealId: string) => {
    try {
      await deleteGuestMeal(guestMealId)
      onUpdate?.()
      toast.success("Guest meal deleted successfully")
    } catch (error) {
      console.error("Error deleting guest meal:", error)
      toast.error("Failed to delete guest meal")
    }
  }

  const getTotalGuestMeals = () => {
    return userGuestMeals.reduce((sum, meal) => {
      const pendingCount = pendingChanges.get(meal.id)
      return sum + (pendingCount !== undefined ? pendingCount : meal.count)
    }, 0)
  }

  if (!session?.user?.id) {
    return null
  }

  return (
    <Card className="border-2 border-dashed border-muted-foreground/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span>Guest Meals</span>
            <Badge variant="secondary" className="ml-2">
              {getTotalGuestMeals()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 rounded-full animate-spin"></div>
          </div>
        ) : userGuestMeals.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No guest meals</p>
            <p className="text-sm text-muted-foreground">Add guest meals for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userGuestMeals.map((guestMeal) => {
              const pendingCount = pendingChanges.get(guestMeal.id)
              const currentCount = pendingCount !== undefined ? pendingCount : guestMeal.count
              const isSaved = savedStates.get(guestMeal.id)
              const isPending = pendingChanges.has(guestMeal.id)

              return (
                <div key={guestMeal.id} className="group relative p-4 border rounded-xl bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                        <AvatarImage src={session.user?.image || "/placeholder.svg"} alt={session.user?.name || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {session.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-base">{guestMeal.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(guestMeal.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Count Controls */}
                      <div className="flex items-center gap-2 bg-background border rounded-full p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/10"
                          onClick={() => handleCountChange(guestMeal.id, currentCount - 1)}
                          disabled={currentCount <= 1 || isUpdating === guestMeal.id}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <div className="flex items-center gap-1 min-w-[3rem] justify-center">
                          <span className="font-bold text-lg">
                            {isUpdating === guestMeal.id ? "..." : currentCount}
                          </span>
                          {isPending && (
                            <Save className="h-3 w-3 text-muted-foreground animate-pulse" />
                          )}
                          {isSaved && (
                            <Check className="h-3 w-3 text-green-500" />
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/10"
                          onClick={() => handleCountChange(guestMeal.id, currentCount + 1)}
                          disabled={currentCount >= guestMealLimit || isUpdating === guestMeal.id}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(guestMeal.id)}
                        disabled={isUpdating === guestMeal.id}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isPending && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 0 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily limit</span>
            <Badge variant="outline">{guestMealLimit} meals</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 