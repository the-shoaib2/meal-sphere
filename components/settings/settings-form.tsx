"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Room, User } from "@prisma/client"
import { updateFineSettingsAction } from "@/lib/actions/group.actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-hot-toast"

const fineSettingsFormSchema = z.object({
  roomId: z.string(),
  fineAmount: z.number().min(0),
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

  const form = useForm<FineSettingsFormValues>({
    resolver: zodResolver(fineSettingsFormSchema),
    defaultValues: {
      fineAmount: 0,
      fineEnabled: false,
    },
  })

  useEffect(() => {
    if (selectedRoom) {
      form.setValue("fineAmount", selectedRoom.fineAmount ?? 0)
      form.setValue("fineEnabled", selectedRoom.fineEnabled)
    }
  }, [selectedRoom, form])

  async function onSubmit(data: FineSettingsFormValues) {
    setIsLoading(true)

    try {
      const result = await updateFineSettingsAction(data.roomId, {
        fineAmount: data.fineAmount,
        fineEnabled: data.fineEnabled,
      })

      if (!result.success) {
        throw new Error(result.message || "Failed to update fine settings")
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
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Fine Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
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
                  <FormLabel>Fine Amount</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.01} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Amount to fine members who miss market duty
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fineEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Enable Fine</FormLabel>
                    <FormDescription className="text-xs">
                      Enable or disable fines for missed duties
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
