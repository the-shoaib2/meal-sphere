
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Bell, 
  Utensils, 
  CreditCard, 
  ShoppingBag, 
  Users 
} from "lucide-react"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        rooms: {
          include: {
            room: true
          }
        }
      }
  })

  if (!user) {
    redirect("/login")
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button size="sm">
          <Bell className="h-4 w-4 mr-2" />
          <span className="sr-only sm:not-sr-only sm:inline">Notifications</span>
        </Button>
      </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45</div>
                  <p className="text-xs text-muted-foreground">+2.5% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Current Rate</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳65.50</div>
                  <p className="text-xs text-muted-foreground">Per meal</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">My Balance</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳2,950</div>
                  <p className="text-xs text-muted-foreground">+1,250 this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2</div>
                  <p className="text-xs text-muted-foreground">12 members total</p>
                </CardContent>
              </Card>
            </div>
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
