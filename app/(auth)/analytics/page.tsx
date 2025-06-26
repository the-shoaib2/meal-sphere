"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useSelectedRoomsAnalytics, useAnalytics, useUserRooms, AnalyticsData } from "@/hooks/use-analytics"
import { useActiveGroup } from "@/contexts/group-context"
import { useState, useEffect } from "react"
import { BarChart3, Filter, CheckSquare, PieChart as PieChartIcon, AreaChart, TrendingUp, Users } from "lucide-react"
import { AnalyticsCard } from "@/components/analytics/analytics-card"
import { RoomStatsTable } from "@/components/analytics/room-stats-table"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart"
import { 
  PieChart, 
  Pie, 
  Cell,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"];

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const { activeGroup } = useActiveGroup()
  const [viewMode, setViewMode] = useState<'current' | 'selected'>('current')
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [showRoomSelector, setShowRoomSelector] = useState(false)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const { data: userRooms = [], isLoading: isLoadingRooms } = useUserRooms()

  const { data: currentGroupData, isLoading: isLoadingCurrent } = useAnalytics()
  const { data: selectedRoomsData, isLoading: isLoadingSelected } = useSelectedRoomsAnalytics(selectedRoomIds)

  const isLoading = viewMode === 'current' ? isLoadingCurrent : isLoadingSelected
  const data = viewMode === 'current' ? currentGroupData : selectedRoomsData

  useEffect(() => {
    if (userRooms.length > 0 && selectedRoomIds.length === 0) {
      setSelectedRoomIds(userRooms.slice(0, 3).map(room => room.id))
    }
  }, [userRooms, selectedRoomIds.length])

  const handleRoomToggle = (roomId: string) => {
    setSelectedRoomIds(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    )
  }

  const handleSelectAll = () => {
    setSelectedRoomIds(userRooms.map(room => room.id))
  }

  const handleDeselectAll = () => {
    setSelectedRoomIds([])
  }

  if (isLoadingRooms) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderContent = (data: AnalyticsData) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-3">
            <AnalyticsCard title="Room Statistics" icon={Users} isLoading={isLoading} description="Key metrics for each room.">
                <RoomStatsTable data={data.roomStats} />
            </AnalyticsCard>
        </div>

        <AnalyticsCard title="Meal Distribution" icon={PieChartIcon} isLoading={isLoading} description="Breakdown of meals by type.">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie data={data.mealDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                        {data.mealDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </AnalyticsCard>

        <AnalyticsCard title="Expense Distribution" icon={PieChartIcon} isLoading={isLoading} description="Breakdown of expenses by type.">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie data={data.expenseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                        {data.expenseDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </AnalyticsCard>

        <AnalyticsCard title="Meal Rate Trend" icon={TrendingUp} isLoading={isLoading} description="Meal rate fluctuations over time.">
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.mealRateTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" name="Meal Rate" />
                </LineChart>
            </ResponsiveContainer>
        </AnalyticsCard>
        
        <div className="xl:col-span-3">
            <AnalyticsCard title="Monthly Expenses" icon={AreaChart} isLoading={isLoading} description="Total expenses per month.">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.monthlyExpenses}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#82ca9d" name="Expenses" />
                    </BarChart>
                </ResponsiveContainer>
            </AnalyticsCard>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            {activeGroup?.name } Analytics
          </p>
        </div>
      </div>

      {viewMode === 'selected' && showRoomSelector && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <CardTitle>Select Rooms for Analytics</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
            <CardDescription>
              Choose which rooms to include in your analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {userRooms.map((room) => (
                <div key={room.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={room.id}
                    checked={selectedRoomIds.includes(room.id)}
                    onCheckedChange={() => handleRoomToggle(room.id)}
                  />
                  <label
                    htmlFor={room.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span>{room.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {room.memberCount} members
                      </Badge>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p>Loading analytics data...</p>}
      {!isLoading && data && renderContent(data)}
      {!isLoading && !data && <p>No data available for the selected view.</p>}
    </div>
  )
} 