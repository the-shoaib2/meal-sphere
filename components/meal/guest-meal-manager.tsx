"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
  isLoading?: boolean
  canEdit?: boolean
}

export default function GuestMealManager({ roomId, date, onUpdate, initialData, isLoading, canEdit = true }: GuestMealManagerProps) {
  const { data: session } = useSession()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const {
    guestMeals,
    getUserGuestMeals,
    patchGuestMeal,
    deleteGuestMeal,
    mealSettings,
    isLoading: isMealLoading
  } = useMeal(roomId, date, initialData)

  const userGuestMeals = getUserGuestMeals(date)
  const guestMealLimit = mealSettings?.guestMealLimit || 10



  const handleCountChange = async (type: string, currentCount: number, delta: number) => {
    const newCount = currentCount + delta
    if (newCount < 1 || newCount > guestMealLimit) return

    try {
      await patchGuestMeal(date, type as any, newCount)
      onUpdate?.()
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleDelete = async (guestMealId: string) => {
    try {
      await deleteGuestMeal(guestMealId)
      onUpdate?.()
    } catch (error) {
      console.error("Error deleting guest meal:", error)
      toast.error("Failed to delete guest meal")
    }
  }

  const getTotalGuestMeals = () => {
    return userGuestMeals.reduce((sum, meal) => sum + meal.count, 0)
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
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-card">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
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
              const currentCount = guestMeal.count

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
                          onClick={() => handleCountChange(guestMeal.type, currentCount, -1)}
                          disabled={!canEdit || currentCount <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <div className="flex items-center gap-1 min-w-[3rem] justify-center">
                          <span className="font-bold text-lg">
                            {currentCount}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-primary/10"
                          onClick={() => handleCountChange(guestMeal.type, currentCount, 1)}
                          disabled={!canEdit || currentCount >= guestMealLimit}
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
                        disabled={!canEdit || isUpdating === guestMeal.id}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>


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