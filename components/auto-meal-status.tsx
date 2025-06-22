"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "react-hot-toast"
import { Clock, Zap, Settings, Check, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { useMeal, type MealType } from "@/hooks/use-meal"

interface AutoMealStatusProps {
  roomId: string
}

export default function AutoMealStatus({ roomId }: AutoMealStatusProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  
  const {
    mealSettings,
    autoMealSettings,
    isLoading,
    updateAutoMealSettings,
    triggerAutoMeals,
    shouldAutoAddMeal,
    isAutoMealTime
  } = useMeal(roomId)

  const handleTriggerAutoMeals = async () => {
    try {
      await triggerAutoMeals(new Date())
      toast.success("Auto meals triggered successfully")
    } catch (error) {
      console.error("Error triggering auto meals:", error)
      toast.error("Failed to trigger auto meals")
    }
  }

  const handleAutoMealToggle = (mealType: MealType, enabled: boolean) => {
    if (!autoMealSettings) return
    
    const updates: any = {}
    if (mealType === 'BREAKFAST') updates.breakfastEnabled = enabled
    if (mealType === 'LUNCH') updates.lunchEnabled = enabled
    if (mealType === 'DINNER') updates.dinnerEnabled = enabled
    
    updateAutoMealSettings(updates)
  }

  if (!session) {
    return null
  }

  const isSystemEnabled = mealSettings?.autoMealEnabled
  const isUserEnabled = autoMealSettings?.isEnabled
  const isFullyEnabled = isSystemEnabled && isUserEnabled

  const mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
  const currentTime = format(new Date(), 'HH:mm')
  const showGuestAuto = autoMealSettings?.guestMealEnabled

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Auto Meal System
          <Badge 
            variant={isFullyEnabled ? "default" : "secondary"} 
            className="ml-auto"
          >
            {isFullyEnabled ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">System Status</span>
            </div>
            <Badge variant={isSystemEnabled ? "default" : "secondary"}>
              {isSystemEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Your Settings</span>
            </div>
            <Badge variant={isUserEnabled ? "default" : "secondary"}>
              {isUserEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Meal Times */}
        {isSystemEnabled && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Meal Times</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-medium">Breakfast</div>
                <div className="text-muted-foreground">{mealSettings?.breakfastTime || "08:00"}</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-medium">Lunch</div>
                <div className="text-muted-foreground">{mealSettings?.lunchTime || "13:00"}</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-medium">Dinner</div>
                <div className="text-muted-foreground">{mealSettings?.dinnerTime || "20:00"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Current Status */}
        {isFullyEnabled && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Status</h4>
            <div className="space-y-1">
              {mealTypes.map((mealType) => {
                const shouldAutoAdd = shouldAutoAddMeal(new Date(), mealType)
                const isAutoTime = isAutoMealTime(new Date(), mealType)
                const isEnabled = mealType === 'BREAKFAST' ? autoMealSettings?.breakfastEnabled :
                                 mealType === 'LUNCH' ? autoMealSettings?.lunchEnabled :
                                 autoMealSettings?.dinnerEnabled
                
                return (
                  <div key={mealType} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{mealType.toLowerCase()}</span>
                    <div className="flex items-center gap-1">
                      {isEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      )}
                      {shouldAutoAdd && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                      {isAutoTime && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Time
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
              {showGuestAuto && (
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize">Guest Meal</span>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                    <Zap className="h-3 w-3 mr-1" />
                    Auto
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Warning */}
        {!isSystemEnabled && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Auto meal system is disabled for this group. Contact an administrator to enable it.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 