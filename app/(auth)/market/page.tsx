import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MarketDateList } from "@/components/market-date-list"
import { MarketDateForm } from "@/components/market-date-form"
import { FineSettingsForm } from "@/components/fine-settings-form"

export default async function MarketDatePage() {
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

  // Check if user is a manager in any room
  const isManager = user.rooms.some((membership) => membership.role === "MANAGER")

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Market Dates</h1>
      <p className="text-muted-foreground">View and manage market dates for your rooms.</p>

      {isManager && (
        <div className="grid gap-6 md:grid-cols-2">
          <MarketDateForm user={user} rooms={rooms} />
          <FineSettingsForm user={user} rooms={rooms} />
        </div>
      )}

      <MarketDateList user={user} rooms={rooms} isManager={isManager} />
    </div>
  )
}
