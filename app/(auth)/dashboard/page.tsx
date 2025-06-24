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
import DashboardSummaryCards from "@/components/dashboard/summary-cards"

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
          room: {
            include: {
              members: true
            }
          }
        }
      }
    }
  })

  if (!user) {
    redirect("/login")
  }

  // Get current month range
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Calculate dashboard summary data
  let totalMeals = 0
  let totalCost = 0
  let totalUserCost = 0
  let totalPaid = 0
  let mealRateSum = 0
  let mealRateCount = 0

  for (const membership of user.rooms) {
    // Get meals for this room in current month
    const meals = await prisma.meal.count({
      where: {
        roomId: membership.roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Get user's meals for this room in current month
    const userMeals = await prisma.meal.count({
      where: {
        userId: user.id,
        roomId: membership.roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Get expenses for this room in current month
    const expenses = await prisma.extraExpense.findMany({
      where: {
        roomId: membership.roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { amount: true },
    })

    const roomExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const mealRate = meals > 0 ? roomExpenses / meals : 0

    totalMeals += userMeals
    totalCost += roomExpenses
    totalUserCost += userMeals * mealRate
    mealRateSum += mealRate
    mealRateCount += 1

    // Get user's payments for this room in current month
    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        roomId: membership.roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      select: { amount: true },
    })
    totalPaid += payments.reduce((sum, p) => sum + p.amount, 0)
  }

  const currentRate = mealRateCount > 0 ? mealRateSum / mealRateCount : 0
  const myBalance = totalPaid - totalUserCost
  const activeRooms = user.rooms.length
  const totalMembers = user.rooms.reduce((acc, r) => acc + (r.room.members?.length || 0), 0)

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
