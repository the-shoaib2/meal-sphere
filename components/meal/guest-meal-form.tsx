"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Plus, Minus, UserPlus, Loader2, Calendar as CalendarIcon, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMeal, type MealType } from "@/hooks/use-meal"
import { isPeriodLocked } from "@/lib/utils/period-utils-shared"

const guestMealSchema = z.object({
  date: z.date(),
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER"] as const),
  notes: z.string().optional(),
})

type GuestMealFormData = z.infer<typeof guestMealSchema>

interface GuestMealFormProps {
  roomId: string
  date?: Date
  onSuccess?: () => void
  // Props lifted from parent
  addGuestMeal: (date: Date, type: MealType, count: number) => Promise<void>
  canEditGuestMeal: (date: Date, type: MealType) => boolean
  mealSettings: any
  autoMealSettings: any
  currentPeriod: any
  getUserGuestMealCount?: (date: Date, type: MealType) => number
}

function GuestMealForm({
  roomId,
  onSuccess,
  date,
  addGuestMeal,
  canEditGuestMeal,
  mealSettings,
  autoMealSettings,
  currentPeriod,
  getUserGuestMealCount
}: GuestMealFormProps) {
  const [open, setOpen] = useState(false)
  const [guestCount, setGuestCount] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch by only rendering Dialog after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<GuestMealFormData>({
    resolver: zodResolver(guestMealSchema),
    defaultValues: {
      date: date || new Date(),
      type: "LUNCH",
      notes: "",
    },
  })

  useEffect(() => {
    if (date) {
      form.setValue("date", date)
    }
  }, [date, form])

  const onSubmit = async (data: GuestMealFormData) => {
    if (getUserGuestMealCount && getUserGuestMealCount(data.date, data.type) > 0) {
      return; // Do nothing if already added (safety measure since UI button shouldn't allow it mostly)
    }

    setIsSubmitting(true)
    try {
      await addGuestMeal(data.date, data.type, guestCount)
      form.reset()
      setGuestCount(1)
      setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Error adding guest meal:", error)
      // Note: The use-meal hook already fires toast.error internally for this action,
      // so we simply catch it here to prevent the modal from closing.
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCountChange = (increment: boolean) => {
    const newCount = increment ? guestCount + 1 : guestCount - 1
    if (newCount >= 1 && newCount <= guestMealLimit) {
      setGuestCount(newCount)
    }
  }

  const isGuestMealsAllowed = mealSettings?.allowGuestMeals ?? true
  // System-wide hard cap: max 10 guest meals per entry, regardless of settings
  const SYSTEM_MAX_GUEST_MEALS = 10
  const guestMealLimit = Math.min(mealSettings?.guestMealLimit ?? SYSTEM_MAX_GUEST_MEALS, SYSTEM_MAX_GUEST_MEALS)

  if (!isGuestMealsAllowed) {
    return (
      <Badge variant="outline" className="border-dashed text-red-500 bg-red-50 font-normal">
        Guest meals disabled
      </Badge>
    )
  }

  if (!mounted) {
    return (
      <Button variant="default" className="w-auto">
        <UserPlus className="h-4 w-4 mr-1" />
        Guest Meal
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-auto">
          <UserPlus className="h-4 w-4 mr-1" />
          Guest Meal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-lg p-5">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle>Add Guest Meal</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            You can add up to {guestMealLimit} guest meals.
          </DialogDescription>
        </DialogHeader>






        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {date && (
              <div className="pt-2 flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-semibold text-muted-foreground text-center block sm:text-left">Selected Date</FormLabel>
                  {autoMealSettings?.isEnabled && mealSettings?.autoMealEnabled && (
                    <Badge variant="destructive" className="flex items-center gap-1 text-[10px] w-fit">
                      <Zap className="h-3 w-3" />
                      AUTO MEALS ACTIVE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <span className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium w-fit text-sm">
                    <CalendarIcon className="h-4 w-4" />
                    {format(date, "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
            )}


            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3 pt-2">
                  <FormLabel className="text-sm font-semibold text-muted-foreground text-center block sm:text-left">Meal Type</FormLabel>
                  <FormControl>
                    <div className="flex flex-col sm:flex-row justify-center sm:justify-start gap-2">
                      {(["BREAKFAST", "LUNCH", "DINNER"] as const).map((type) => {
                        const isLocked = !canEditGuestMeal(form.watch("date"), type);
                        const isAlreadyAdded = getUserGuestMealCount ? getUserGuestMealCount(form.watch("date"), type) > 0 : false;
                        const isDisabled = isLocked || isAlreadyAdded;
                        const isSelected = field.value === type;

                        return (
                          <div key={type} className="flex-1 flex flex-col gap-1">
                            <Button
                              type="button"
                              disabled={isDisabled}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "w-full h-11 cursor-pointer rounded-full sm:h-10 transition-all font-medium",
                                isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-transparent" : "hover:bg-primary/10 hover:text-primary",
                                isDisabled && "opacity-50 grayscale-[0.5]"
                              )}
                              onClick={() => field.onChange(type)}
                            >
                              <span className="mr-2 text-base">
                                {type === "BREAKFAST" ? "🌅" : type === "LUNCH" ? "☀️" : "🌙"}
                              </span>
                              {type === "BREAKFAST" ? "Breakfast" : type === "LUNCH" ? "Lunch" : "Dinner"}
                            </Button>
                            {(isLocked || isAlreadyAdded) && (
                              <span className="text-[9px] text-red-500 font-bold text-center uppercase tracking-tighter">
                                {isAlreadyAdded ? "Already Added" : isPeriodLocked(currentPeriod) ? "Locked" : "Time Passed"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 flex flex-col">
              <FormLabel className="text-sm font-semibold text-muted-foreground">Guest Count</FormLabel>
              <div className="flex flex-col justify-center items-center gap-2">
                <div className="flex items-center gap-4 border-2 rounded-full p-1.5 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleCountChange(false)}
                    disabled={guestCount <= 1}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center justify-center w-12 text-center">
                    <span className="text-3xl font-bold text-primary">{guestCount}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary"
                    onClick={() => handleCountChange(true)}
                    disabled={guestCount >= guestMealLimit}
                  >
                    <Plus className="h-5 w-5 font-bold" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  Max: {guestMealLimit}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="pt-1">
                  <FormLabel className="text-center text-muted-foreground sm:text-left block font-medium">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Any special requirements..."
                      className="h-11 sm:h-10 text-center sm:text-left"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"

                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto hover:text-red-500">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !canEditGuestMeal(form.getValues("date"), form.getValues("type")) || (getUserGuestMealCount ? getUserGuestMealCount(form.getValues("date"), form.getValues("type")) > 0 : false)}
                className="w-full sm:w-auto hover:bg-primary/90">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    {autoMealSettings?.isEnabled && mealSettings?.autoMealEnabled ? (
                      <Zap className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-600" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {`Add ${guestCount} Guest Meal${guestCount > 1 ? 's' : ''}`}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default React.memo(GuestMealForm)
