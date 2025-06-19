import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { DataVisualization } from "@/components/data-visualization"

interface CalculationResult {
  id: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  totalMeals: number;
  totalExpense: number;
  mealRate: number;
}

export default async function AnalyticsPage() {
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
          room: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Get room IDs the user is a member of
  const roomIds = user.rooms.map((membership) => membership.roomId)

  // Fetch meals
  const meals = await prisma.meal.findMany({
    where: {
      roomId: {
        in: roomIds,
      },
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Fetch expenses
  const expenses = await prisma.extraExpense.findMany({
    where: {
      roomId: {
        in: roomIds,
      },
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Fetch shopping items
  const shoppingItems = await prisma.shoppingItem.findMany({
    where: {
      roomId: {
        in: roomIds,
      },
    },
    include: {
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Calculate meal rates for each room
  const calculations: CalculationResult[] = await Promise.all(
    roomIds.map(async (roomId) => {
      // Get all meals for this room
      const roomMeals = meals.filter(meal => meal.roomId === roomId)
      
      // Get all expenses for this room
      const roomExpenses = expenses.filter(expense => expense.roomId === roomId)
      
      // Get all shopping items for this room
      const roomShopping = shoppingItems.filter(item => item.roomId === roomId)
      
      // Calculate total meals
      const totalMeals = roomMeals.length
      
      // Calculate total expenses
      const totalExpense = roomExpenses.reduce((sum, expense) => sum + expense.amount, 0) +
                          roomShopping.reduce((sum, item) => sum + (item.quantity || 0), 0)
      
      // Calculate meal rate
      const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0
      
      // Get date range
      const dates = [...roomMeals, ...roomExpenses, ...roomShopping].map(item => item.date)
      const startDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())))
      
      return {
        id: roomId,
        roomId,
        startDate,
        endDate,
        totalMeals,
        totalExpense,
        mealRate,
      }
    })
  )

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <p className="text-muted-foreground">Visualize your meal and expense data.</p>

      <DataVisualization
        meals={meals}
        expenses={expenses}
        shoppingItems={shoppingItems}
        calculations={calculations || []}
      />
    </div>
  )
}
