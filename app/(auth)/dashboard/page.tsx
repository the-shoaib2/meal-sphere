import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Bell,
  Utensils,
  CreditCard,
  ShoppingBag,
  Users
} from "lucide-react"
import DashboardSummaryCards from "@/components/dashboard/summary-cards"
import { useDashboardSummary } from "@/hooks/use-dashboard"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button size="sm">
          <Bell className="h-4 w-4 mr-2" />
          <span className="sr-only sm:not-sr-only sm:inline">Notifications</span>
        </Button>
      </div>
      
      <DashboardSummaryCards
        totalMeals={totalMeals}
        currentRate={currentRate}
        myBalance={myBalance}
        totalCost={totalCost}
        activeRooms={activeRooms}
        totalMembers={totalMembers}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Meal Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {/* This would be a chart component */}
              <div className="flex items-center justify-center h-full border rounded-md bg-muted/20">
                <p className="text-sm text-muted-foreground">Monthly meal chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Your recent meal and payment activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-2 mr-3">
                  <Utensils className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Lunch added</p>
                  <p className="text-sm text-muted-foreground">Today, 12:30 PM</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-2 mr-3">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Payment received</p>
                  <p className="text-sm text-muted-foreground">Yesterday, 3:45 PM</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-2 mr-3">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Shopping cost added</p>
                  <p className="text-sm text-muted-foreground">2 days ago, 10:15 AM</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-2 mr-3">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Joined Room 2</p>
                  <p className="text-sm text-muted-foreground">3 days ago, 5:30 PM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
