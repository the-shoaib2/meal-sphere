import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/services/prisma"
import { ProfileForm } from "@/components/settings/profile-form"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { EmailVerificationCard } from "@/components/settings/email-verification-card"
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card"
import { ChangePasswordCard } from "@/components/settings/change-password-card"
import { PrivacyForm } from "@/components/settings/privacy-form"
import { NotificationsSettingsCard } from "@/components/settings/notifications-settings-card"
import { getAllActiveSessions } from "@/lib/auth/session-manager"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const [user, activeSessions] = await Promise.all([
    prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        accounts: true,
      },
    }),
    getAllActiveSessions(session.user.id)
  ])

  if (!user) {
    redirect("/login")
  }

  const isGoogleUser = user.accounts.some((account) => account.provider === "google")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <ProfileForm user={user} isGoogleUser={isGoogleUser} />
        <PrivacyForm user={user} />
        <AppearanceForm user={user} />
        <EmailVerificationCard user={user} />
        <EmailVerificationCard user={user} />
        <ActiveSessionsCard user={user} initialSessions={activeSessions} />
        <NotificationsSettingsCard />
      </div>
    </div>
  )
}
