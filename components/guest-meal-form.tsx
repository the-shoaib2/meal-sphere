"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Room, User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import { ResponsiveFormLayout, ResponsiveFormItem } from "@/components/ui/responsive-form-layout"
import { useIsMobile } from "@/hooks/use-mobile"

const guestMealFormSchema = z.object({
  roomId: z.string({
    required_error: "Please select a room",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER"], {
    required_error: "Please select a meal type",
  }),
  count: z.coerce.number().min(1).max(10, {
    message: "You can request up to 10 guest meals",
  }),
})

type GuestMealFormValues = z.infer<typeof guestMealFormSchema>

interface GuestMealFormProps {
  user: User
  rooms: Room[]
}

export function GuestMealForm({ user, rooms }: GuestMealFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()
  const isMobile = useIsMobile()

  const form = useForm<GuestMealFormValues>({
    resolver: zodResolver(guestMealFormSchema),
    defaultValues: {
      count: 1,
      date: new Date(),
    },
  })

  async function onSubmit(data: GuestMealFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/meals/guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to request guest meal")
      }

      toast.success("Guest meal requested successfully")
      form.reset({
        roomId: data.roomId,
        date: new Date(),
        type: "BREAKFAST",
        count: 1,
      })
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to request guest meal")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ResponsiveFormLayout>
              <ResponsiveFormItem>
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("meals.room")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ResponsiveFormItem>

              <ResponsiveFormItem>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("meals.date")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ResponsiveFormItem>

              <ResponsiveFormItem>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("meals.type")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select meal type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BREAKFAST">{t("meals.breakfast")}</SelectItem>
                          <SelectItem value="LUNCH">{t("meals.lunch")}</SelectItem>
                          <SelectItem value="DINNER">{t("meals.dinner")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ResponsiveFormItem>

              <ResponsiveFormItem>
                <FormField
                  control={form.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("meals.guestCount")}</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={10} {...field} />
                      </FormControl>
                      <FormDescription>You can request up to 10 guest meals at a time.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ResponsiveFormItem>
            </ResponsiveFormLayout>

            <Button type="submit" disabled={isLoading} className={isMobile ? "w-full" : ""}>
              {isLoading ? "Submitting..." : t("button.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
