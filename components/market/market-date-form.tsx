"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Room, User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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

const marketDateFormSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  date: z.date(),
})

type MarketDateFormValues = z.infer<typeof marketDateFormSchema>

interface MarketDateFormProps {
  user: User
  rooms: Room[]
}

export function MarketDateForm({ user, rooms }: MarketDateFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [roomMembers, setRoomMembers] = useState<{ id: string; name: string }[]>([])
  const { t } = useLanguage()
  const isMobile = useIsMobile()

  const form = useForm<MarketDateFormValues>({
    resolver: zodResolver(marketDateFormSchema),
    defaultValues: {
      date: new Date(),
    },
  })

  async function onSubmit(data: MarketDateFormValues) {
    setIsLoading(true)

    try {
      const { createMarketDateAction } = await import('@/lib/actions/market-dates.actions');
      const response = await createMarketDateAction({
        roomId: data.roomId,
        userId: data.userId,
        date: data.date
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to assign market date")
      }

      toast.success("Market date assigned successfully")
      form.reset({
        roomId: data.roomId,
        date: new Date(),
        userId: "",
      })
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to assign market date")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchRoomMembers(roomId: string) {
    try {
      const response = await fetch(`/api/rooms/${roomId}/members`)

      if (!response.ok) {
        throw new Error("Failed to fetch room members")
      }

      const data = await response.json()
      setRoomMembers(
        data.map((member: any) => ({
          id: member.user.id,
          name: member.user.name,
        })),
      )
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch room members")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("market.assign")}</CardTitle>
      </CardHeader>
      <CardContent>
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
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          fetchRoomMembers(value)
                        }}
                        defaultValue={field.value}
                      >
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
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("market.member")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roomMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
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
                      <FormLabel>{t("market.date")}</FormLabel>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                            captionLayout="dropdown"
                            fromYear={new Date().getFullYear()}
                            toYear={new Date().getFullYear() + 2}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Select a date for the market duty.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ResponsiveFormItem>
            </ResponsiveFormLayout>

            <Button type="submit" disabled={isLoading} className={isMobile ? "w-full" : ""}>
              {isLoading ? "Assigning..." : t("button.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
