"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, Minus, UserPlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMeal, type MealType } from "@/hooks/use-meal"

const guestMealSchema = z.object({
  date: z.date(),
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER"] as const),
  notes: z.string().optional(),
})

type GuestMealFormData = z.infer<typeof guestMealSchema>

interface GuestMealFormProps {
  roomId: string
  onSuccess?: () => void
  initialData?: any
}

export default function GuestMealForm({ roomId, onSuccess, initialData }: GuestMealFormProps) {
  const [open, setOpen] = useState(false)
  const [guestCount, setGuestCount] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { addGuestMeal, mealSettings, isLoading } = useMeal(roomId, undefined, initialData)

  const form = useForm<GuestMealFormData>({
    resolver: zodResolver(guestMealSchema),
    defaultValues: {
      date: new Date(),
      type: "LUNCH",
      notes: "",
    },
  })

  const onSubmit = async (data: GuestMealFormData) => {
    setIsSubmitting(true)
    try {
      await addGuestMeal(data.date, data.type, guestCount)
      form.reset()
      setGuestCount(1)
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error adding guest meal:", error)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto hover:bg-primary/5 hover:text-primary transition-colors">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Guest Meal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Add Guest Meal</DialogTitle>
          <DialogDescription>
            Add guest meals for a specific date and time. You can add up to {guestMealLimit} guest meals.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a meal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                      <SelectItem value="LUNCH">Lunch</SelectItem>
                      <SelectItem value="DINNER">Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Guest Count</FormLabel>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCountChange(false)}
                    disabled={guestCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold min-w-[2rem] text-center">{guestCount}</span>
                    <Badge variant="secondary">guests</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCountChange(true)}
                    disabled={guestCount >= guestMealLimit}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Max: {guestMealLimit}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Any special requirements or notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${guestCount} Guest Meal${guestCount > 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
