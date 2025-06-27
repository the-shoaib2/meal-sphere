import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SettingsTabs } from "@/components/settings-tabs"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold">Profile Settings</h1>
      <SettingsTabs user={user} />
    </div>
  )
}
