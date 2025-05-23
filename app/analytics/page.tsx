import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DataVisualization } from "@/components/data-visualization"

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

  // Fetch calculations
  // Note: This is a placeholder. You'll need to implement the actual calculations table
  const calculations = (await prisma.$queryRaw`
    SELECT 
      c.id, 
      c.room_id AS "roomId", 
      c.start_date AS "startDate", 
      c.end_date AS "endDate", 
      c.total_meals AS "totalMeals", 
      c.total_expense AS "totalExpense", 
      c.meal_rate AS "mealRate"
    FROM calculations c
    WHERE c.room_id IN (${roomIds.join(",")})
    ORDER BY c.start_date DESC
  `) as any[]

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
