"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Utensils,
  CreditCard,
  ShoppingBag,
  Users,
  RefreshCw,
  Settings,
  BarChart3,
  CheckSquare,
  PieChart as PieChartIcon,
  AreaChart,
  TrendingUp,
} from "lucide-react"
import DashboardSummaryCards from "@/components/dashboard/summary-cards"
import MealChart from "@/components/dashboard/meal-chart"
import RecentActivities from "@/components/dashboard/recent-activities"
import { useDashboardRefresh, useDashboard } from "@/hooks/use-dashboard"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { DashboardProvider } from "@/contexts/dashboard-context"
import { useActiveGroup } from "@/contexts/group-context"
import { useSelectedRoomsAnalytics, useAnalytics, useUserRooms, AnalyticsData } from "@/hooks/use-analytics"
import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { AnalyticsCard } from "@/components/analytics/analytics-card"
import { RoomStatsTable } from "@/components/analytics/room-stats-table"
import { NoGroupState } from "@/components/empty-states/no-group-state"
import { useGroups } from "@/hooks/use-groups"
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
import { SummaryCards } from "@/components/calculations"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { activeGroup, isLoading: isGroupLoading } = useActiveGroup();

  // Unified Data Fetch
  const {
    data: unifiedData,
    isLoading: isUnifiedLoading,
    refetch: refreshDashboard, // Alias to existing name
    isRefetching: isUnifiedRefetching
  } = useDashboard();

  // Fetch groups independently to verify existence regardless of active group
  const { data: allUserGroups = [], isLoading: isLoadingAllGroups } = useGroups();

  const isDashboardLoading = isUnifiedLoading;
  const isRefreshing = isUnifiedRefetching;
  const dashboardData = unifiedData?.summary;
  const userGroups = allUserGroups;
  const isLoadingGroups = isLoadingAllGroups;

  // Analytics State
  const [viewMode, setViewMode] = useState<'current' | 'selected'>('current')
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [showRoomSelector, setShowRoomSelector] = useState(false)

  // Analytics Data
  const { data: userRoomsData = [], isLoading: isLoadingUserRooms } = useUserRooms();
  const userRooms = userRoomsData; // Use dedicated hook data
  const isLoadingRooms = isLoadingUserRooms;

  const { data: currentAnalyticsData, isLoading: isLoadingAnalyticsCurrent } = useAnalytics();
  const currentGroupData = currentAnalyticsData;
  const isLoadingCurrent = isLoadingAnalyticsCurrent;

  // Specific hook for "selected rooms" view (interactive)
  const { data: selectedRoomsData, isLoading: isLoadingSelected } = useSelectedRoomsAnalytics(selectedRoomIds, { enabled: viewMode === 'selected' })

  const isAnalyticsLoading = viewMode === 'current' ? isLoadingCurrent : isLoadingSelected
  const analyticsData = viewMode === 'current' ? currentGroupData : selectedRoomsData

  // Effect for room selection - MOVED UP to avoid hook order issues
  useEffect(() => {
    if (userRooms.length > 0 && selectedRoomIds.length === 0) {
      setSelectedRoomIds(userRooms.slice(0, 3).map((room: any) => room.id))
    }
  }, [userRooms, selectedRoomIds.length])

  // Handle redirects based on auth status
  if (status === 'unauthenticated') {
    redirect("/login");
  }

  // --- LOGIC FLOW: Loading -> Empty -> Content ---

  // 1. Loading State
  // Show skeletons if:
  // - Session is loading
  // - Global group context is loading
  // - Group list is being fetched
  // - Dashboard data is loading (and we have an active group)
  // - We are refreshing
  const shouldShowLoading = status === 'loading' || isGroupLoading || isLoadingAllGroups || (!!activeGroup && isUnifiedLoading) || isRefreshing;

  if (shouldShowLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">

        {/* Summary Cards Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 rounded-md" />
            <Skeleton className="h-4 sm:h-5 w-16 sm:w-20 rounded-md" />
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={`skeleton-card-${i}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                  <Skeleton className="h-5 w-5 sm:h-6 sm:w-6" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 sm:h-8 w-20 sm:w-24 mb-1 sm:mb-2" />
                  <Skeleton className="h-3 sm:h-4 w-28 sm:w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <Skeleton className="h-5 sm:h-6 w-36 sm:w-48 rounded-md" />
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
            {/* Chart Section */}
            <div className="lg:col-span-4">
              <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded-md" />
                    <Skeleton className="h-5 sm:h-6 w-36 sm:w-48" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-4 text-xs sm:text-sm">
                    {[...Array(4)].map((_, i) => (
                      <Card key={`chart-stat-${i}`} className="p-2 border-0 bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-2 h-2 rounded-full" />
                          <div className="min-w-0">
                            <Skeleton className="h-2.5 sm:h-3 w-6 sm:w-8 mb-1" />
                            <Skeleton className="h-3 sm:h-4 w-8 sm:w-12" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className=" w-full" />
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <div className="lg:col-span-3">
              <Card className="h-[350px] sm:h-[400px] lg:h-[450px] xl:h-[500px]">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded-md" />
                    <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
                  </div>
                  <Skeleton className="h-3 sm:h-4 w-36 sm:w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center">
                        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full mr-2 sm:mr-3" />
                        <div className="space-y-1.5 sm:space-y-2 flex-1">
                          <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32" />
                          <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 rounded-md" />
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={`quick-action-${i}`} className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Skeleton className="h-7 w-7 sm:h-9 sm:w-9 rounded-full" />
                    <div>
                      <Skeleton className="h-4 sm:h-5 w-16 sm:w-24 mb-1" />
                      <Skeleton className="h-3 sm:h-4 w-20 sm:w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Check if user has no groups - show empty state
  if (!isUnifiedLoading && !isLoadingAllGroups && !activeGroup && allUserGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Welcome to MealSphere! Get started by creating or joining a group.
            </p>
          </div>
        </div>
        <NoGroupState />
      </div>
    );
  }

  // Handle case where activeGroup is missing but user has groups (should select one)
  if (!isUnifiedLoading && !isLoadingAllGroups && !activeGroup && allUserGroups.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-xl font-semibold">No Group Selected</h2>
        <p className="text-muted-foreground">Please select a group from the sidebar to view the dashboard.</p>
      </div>
    )
  }

  const handleRoomToggle = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    )
  }

  const handleSelectAll = () => {
    setSelectedRoomIds(userRooms.map((room: any) => room.id))
  }

  const handleDeselectAll = () => {
    setSelectedRoomIds([])
  }

  // Use fetched data with safe defaults
  const totalMeals = dashboardData?.totalUserMeals ?? 0
  const currentRate = dashboardData?.currentRate ?? 0
  const myBalance = dashboardData?.currentBalance ?? 0
  const totalCost = dashboardData?.totalCost ?? 0
  const activeRooms = dashboardData?.activeRooms ?? 0
  const totalMembers = dashboardData?.totalMembers ?? 0

  const AnalyticsSkeleton = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      <div className="xl:col-span-3">
        <AnalyticsCard title="Room Statistics" icon={Users} isLoading={true} description="Key metrics for each room.">
          <Skeleton className="h-[200px] w-full" />
        </AnalyticsCard>
      </div>

      <AnalyticsCard title="Meal Distribution" icon={PieChartIcon} isLoading={true} description="Breakdown of meals by type.">
        <Skeleton className="h-[250px] w-full" />
      </AnalyticsCard>

      <AnalyticsCard title="Expense Distribution" icon={PieChartIcon} isLoading={true} description="Breakdown of expenses by type.">
        <Skeleton className="h-[250px] w-full" />
      </AnalyticsCard>
    </div>
  )

  const renderAnalyticsContent = (data: AnalyticsData) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      <div className="xl:col-span-3">
        <AnalyticsCard title="Room Statistics" icon={Users} isLoading={isAnalyticsLoading} description="Key metrics for each room.">
          <RoomStatsTable data={data?.roomStats || []} />
        </AnalyticsCard>
      </div>

      <AnalyticsCard title="Meal Distribution" icon={PieChartIcon} isLoading={isAnalyticsLoading} description="Breakdown of meals by type.">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={(data?.mealDistribution || []) as any} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
              {(data?.mealDistribution || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </AnalyticsCard>

      <AnalyticsCard title="Expense Distribution" icon={PieChartIcon} isLoading={isAnalyticsLoading} description="Breakdown of expenses by type.">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={(data?.expenseDistribution || []) as any} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
              {(data?.expenseDistribution || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </AnalyticsCard>

      <AnalyticsCard title="Meal Rate Trend" icon={TrendingUp} isLoading={isAnalyticsLoading} description="Meal rate fluctuations over time.">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data?.mealRateTrend || []}>
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
        <AnalyticsCard title="Monthly Expenses" icon={AreaChart} isLoading={isAnalyticsLoading} description="Total expenses per month.">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.monthlyExpenses || []}>
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
    <DashboardProvider>
      <div className="space-y-4 sm:space-y-6">

        {/* Summary Cards Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold">Overview</h2>
            <Badge variant="secondary" className="ml-2 text-xs">
              {dashboardData ? 'Live Data' : 'Loading...'}
            </Badge>
          </div>
          {unifiedData?.summary && <DashboardSummaryCards
            totalMeals={unifiedData.summary.totalUserMeals}
            currentRate={unifiedData.summary.currentRate}
            myBalance={unifiedData.summary.currentBalance}
            totalCost={unifiedData.summary.totalCost}
            activeRooms={unifiedData.summary.activeRooms}
            totalMembers={unifiedData.summary.totalMembers}
            totalAllMeals={unifiedData.summary.totalAllMeals}
            availableBalance={unifiedData.summary.availableBalance}
            groupBalance={unifiedData.groupBalance}
          />}
        </div>

        {/* Main Content Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold">Activity Overview</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-7 sm:h-8 lg:h-9 px-2 sm:px-3 w-full sm:w-auto"
              onClick={() => refreshDashboard()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <MealChart />
            </div>
            <div className="lg:col-span-3">
              <RecentActivities />
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold">Quick Actions</h2>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Add Meal</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Record today's meal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Make Payment</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Add payment record</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Shopping List</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage shopping items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">Group Settings</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage group preferences</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Analytics Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-lg sm:text-xl font-semibold">Detailed Analytics</h2>
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
                  {userRooms.map((room: any) => (
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

          {isAnalyticsLoading && <AnalyticsSkeleton />}
          {!isAnalyticsLoading && analyticsData && renderAnalyticsContent(analyticsData)}
          {!isAnalyticsLoading && !analyticsData && <p className="text-muted-foreground">No analytics data available.</p>}
        </div>

      </div>
    </DashboardProvider>
  )
}
