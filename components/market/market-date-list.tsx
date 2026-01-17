"use client"

import { useState, useEffect } from "react"
import type { Room, User, MarketDate } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import { format } from "date-fns"
import { Calendar, CheckCircle, XCircle } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { ResponsiveTable } from "./ui/responsive-table"

interface MarketDateWithUser extends MarketDate {
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
  fined?: boolean
}

interface MarketDateListProps {
  user: User
  rooms: Room[]
  isManager: boolean
}

export function MarketDateList({ user, rooms, isManager }: MarketDateListProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [marketDates, setMarketDates] = useState<MarketDateWithUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (selectedRoomId) {
      fetchMarketDates()
    }
  }, [selectedRoomId])

  async function fetchMarketDates() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/market-dates?roomId=${selectedRoomId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch market dates")
      }

      const data = await response.json()
      setMarketDates(data)
    } catch (error) {
      console.error(error)
      toast.error("Failed to fetch market dates")
    } finally {
      setIsLoading(false)
    }
  }

  async function updateMarketDateStatus(id: string, completed: boolean) {
    try {
      const response = await fetch(`/api/market-dates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: completed ? 'COMPLETED' : 'UPCOMING' }),
      })

      if (!response.ok) {
        throw new Error("Failed to update market date status")
      }

      toast.success("Market date status updated successfully")
      fetchMarketDates()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update market date status")
    }
  }

  async function applyFine(id: string) {
    try {
      const response = await fetch(`/api/market-dates/${id}/fine`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to apply fine")
      }

      toast.success("Fine applied successfully")
      fetchMarketDates()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to apply fine")
    }
  }

  const columns = [
    {
      key: "date",
      title: "Date",
      render: (value: string) => (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 hidden sm:inline" />
          {format(new Date(value), "PPP")}
        </div>
      ),
    },
    {
      key: "user",
      title: "Member",
      render: (value: any, row: MarketDateWithUser) => (
        <div className="flex items-center">
          {value.name}
          {row.userId === user.id && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">You</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (value: string) => {
        const isCompleted = value === 'COMPLETED'
        return isCompleted ? (
          <span className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Completed
          </span>
        ) : (
          <span className="flex items-center text-red-600">
            <XCircle className="h-4 w-4 mr-1" />
            {value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ')}
          </span>
        )
      },
    },
    {
      key: "fined",
      title: "Fined",
      render: (value: boolean) =>
        value ? (
          <span className="flex items-center text-amber-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Yes
          </span>
        ) : (
          <span className="flex items-center text-gray-600">
            <XCircle className="h-4 w-4 mr-1" />
            No
          </span>
        ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, row: MarketDateWithUser) => {
        const isPastDate = new Date(row.date) < new Date()
        const isCurrentUser = row.userId === user.id
        const isCompleted = row.status === 'COMPLETED'

        return (
          <div className="flex flex-col sm:flex-row gap-2">
            {isManager && isPastDate && !isCompleted && !row.fined && (
              <Button size="sm" variant="destructive" onClick={() => applyFine(row.id)}>
                Fine
              </Button>
            )}
            {(isCurrentUser || isManager) && !isCompleted && (
              <Button size="sm" variant="outline" onClick={() => updateMarketDateStatus(row.id, true)}>
                Complete
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("market.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Select onValueChange={setSelectedRoomId} value={selectedRoomId}>
              <SelectTrigger className="w-full sm:w-auto">
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
          </div>

          {selectedRoomId && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <ResponsiveTable
                  columns={columns}
                  data={marketDates.map((date) => ({
                    ...date,
                    actions: null, // This is just a placeholder for the actions column
                  }))}
                  emptyMessage="No market dates found"
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
