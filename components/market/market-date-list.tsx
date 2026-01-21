"use client"

import { useState, useEffect } from "react"
import type { MarketDate } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"
import { format } from "date-fns"
import { Calendar, CheckCircle, XCircle } from "lucide-react"
import { ResponsiveTable } from "../ui/responsive-table"
import { useRouter } from "next/navigation"

interface MarketDateWithUser extends MarketDate {
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
  fined?: boolean
}


export function MarketDateList({ marketDates: initialMarketDates, isManager, currentUserId }: { marketDates: MarketDateWithUser[], isManager: boolean, currentUserId: string }) {
  const [marketDates, setMarketDates] = useState<MarketDateWithUser[]>(initialMarketDates)
  const { t } = useLanguage()
  const router = useRouter() // Used for refresh if needed

  // Sync with props
  useEffect(() => {
    setMarketDates(initialMarketDates);
  }, [initialMarketDates]);

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
      router.refresh(); // Refresh server data
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
      router.refresh(); // Refresh server data
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
          {row.userId === currentUserId && (
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
        const isCurrentUser = row.userId === currentUserId
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
          <div className="space-y-4">
            <ResponsiveTable
              columns={columns}
              data={marketDates.map((date) => ({
                ...date,
                actions: null, // This is just a placeholder for the actions column
              }))}
              emptyMessage="No market dates found"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
