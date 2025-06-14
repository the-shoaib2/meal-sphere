"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Room, User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"

const fineSettingsFormSchema = z.object({
  roomId: z.string({
    required_error: "Please select a room",
  }),
  fineAmount: z.coerce.number().min(0),
  fineEnabled: z.boolean(),
})

type FineSettingsFormValues = z.infer<typeof fineSettingsFormSchema>

interface FineSettingsFormProps {
  user: User
  rooms: Room[]
}

export function FineSettingsForm({ user, rooms }: FineSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const { t } = useLanguage()

  const form = useForm<FineSettingsFormValues>({
    resolver: zodResolver(fineSettingsFormSchema),
    defaultValues: {
      fineAmount: 0,
      fineEnabled: false,
    },
  })

  useEffect(() => {
    if (selectedRoom) {
      form.setValue("fineAmount", selectedRoom.fineAmount)
      form.setValue("fineEnabled", selectedRoom.fineEnabled)
    }
  }, [selectedRoom, form])

  async function onSubmit(data: FineSettingsFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/rooms/${data.roomId}/fine-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fineAmount: data.fineAmount,
          fineEnabled: data.fineEnabled,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update fine settings")
      }

      toast.success("Fine settings updated successfully")
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to update fine settings")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchRoomDetails(roomId: string) {
    try {
      const room = rooms.find((r) => r.id === roomId) || null
      setSelectedRoom(room)
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch room details")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("market.fineAmount")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("meals.room")}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      fetchRoomDetails(value)
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
            <FormField
              control={form.control}
              name="fineAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("market.fineAmount")}</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.01} {...field} />
                  </FormControl>
                  <FormDescription>The amount to fine members who miss their market duty.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fineEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("market.enableFine")}</FormLabel>
                    <FormDescription>Enable or disable fines for missed market duties.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : t("button.save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
