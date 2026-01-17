import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/services/prisma"
import { ProfileForm } from "@/components/settings/profile-form"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { EmailVerificationCard } from "@/components/settings/email-verification-card"
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card"
import { ChangePasswordCard } from "@/components/settings/change-password-card"

export default async function SettingsPage() {
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-4">
        <ProfileForm user={user} />
        <AppearanceForm user={user} />
        <EmailVerificationCard user={user} />
        <ActiveSessionsCard user={user} />
        <ChangePasswordCard user={user} />
      </div>
    </div>
  )
}
