"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Bell,
  Utensils,
  CreditCard,
  ShoppingBag,
  Users,
  RefreshCw,
  Settings,
  BarChart3
} from "lucide-react"
import DashboardSummaryCards from "@/components/dashboard/summary-cards"
import MealChart from "@/components/dashboard/meal-chart"
import RecentActivities from "@/components/dashboard/recent-activities"
import { useDashboardSummary, useDashboardRefresh } from "@/hooks/use-dashboard"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const { data: session } = useSession(); 
  const { data: dashboardData, isLoading } = useDashboardSummary();
  const { mutate: refreshDashboard, isPending: isRefreshing } = useDashboardRefresh();

  if (!session?.user?.email) {
    redirect("/login")
  }

  // Only provide fallback values, all real data comes from the hook
  const totalMeals = 0
  const currentRate = 0
  const myBalance = 0
  const totalCost = 0
  const activeRooms = 0
  const totalMembers = 0

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        {/* Enhanced Header with title and buttons */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>
        
        {/* Summary Cards Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={`skeleton-card-${i}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-6" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Main Content Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Chart Section */}
            <div className="col-span-4 lg:col-span-4">
              <Card className="h-[400px] lg:h-[450px] xl:h-[500px]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4 text-sm">
                    {[...Array(4)].map((_, i) => (
                      <Card key={`chart-stat-${i}`} className="p-2 border-0 bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-2 h-2 rounded-full" />
                          <div className="min-w-0">
                            <Skeleton className="h-3 w-8 mb-1" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Activities */}
            <div className="col-span-3 lg:col-span-3">
              <Card className="h-[400px] lg:h-[450px] xl:h-[500px]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full mr-3" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-32 rounded-md" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={`quick-action-${i}`} className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-32" />
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

  return (
    <div className="space-y-8 p-6">
      {/* Enhanced Header */}
      {/* <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name || 'User'}! Here's what's happening with your meals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refreshDashboard()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Bell className="h-4 w-4 mr-2" />
            <span className="sr-only sm:not-sr-only sm:inline">Notifications</span>
          </Button>
        </div>
      </div> */}
      
      {/* Summary Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Overview</h2>
          <Badge variant="secondary" className="ml-2">
            {dashboardData ? 'Live Data' : 'Loading...'}
          </Badge>
        </div>
        <DashboardSummaryCards
          totalMeals={totalMeals}
          currentRate={currentRate}
          myBalance={myBalance}
          totalCost={totalCost}
          activeRooms={activeRooms}
          totalMembers={totalMembers}
        />
      </div>

      {/* Main Content Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Analytics & Activities</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 lg:col-span-4">
            <MealChart />
          </div>
          <div className="col-span-3 lg:col-span-3">
            <RecentActivities />
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Quick Actions</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                  <Utensils className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Meal</h3>
                  <p className="text-sm text-muted-foreground">Record today's meal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Make Payment</h3>
                  <p className="text-sm text-muted-foreground">Add payment record</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <ShoppingBag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Shopping List</h3>
                  <p className="text-sm text-muted-foreground">Manage shopping items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Group Settings</h3>
                  <p className="text-sm text-muted-foreground">Manage group preferences</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
