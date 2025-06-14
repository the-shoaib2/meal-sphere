import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { GuestMealForm } from "@/components/guest-meal-form"

export default async function GuestMealPage() {
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
      <h1 className="text-3xl font-bold">Guest Meal Request</h1>
      <p className="text-muted-foreground">
        Request meals for your guests. You can request up to 10 guest meals at a time.
      </p>
      <GuestMealForm user={user} rooms={rooms} />
    </div>
  )
}
