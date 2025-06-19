import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ExtraExpenseForm } from "@/components/extra-expense-form"
import { ExpenseList } from "@/components/expense-list"

export default async function ExpensesPage() {
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

  const rooms = user.rooms.map((membership) => membership.room)

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Extra Expenses</h1>
      <p className="text-muted-foreground">Track additional expenses like utilities, rent, internet, and more.</p>

      <ExtraExpenseForm user={user} rooms={rooms} />

      <ExpenseList user={user} rooms={rooms} />
    </div>
  )
}
