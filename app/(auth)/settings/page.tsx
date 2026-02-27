import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/services/prisma"
import { ProfileForm } from "@/components/settings/profile-form"
import { AppearanceForm } from "@/components/settings/appearance-form"
import { ActiveSessionsCard } from "@/components/settings/active-sessions-card"
import { PrivacyForm } from "@/components/settings/privacy-form"
import { NotificationsSettingsCard } from "@/components/settings/notifications-settings-card"
import { getAllActiveSessions } from "@/lib/auth/session-manager"
import { PageHeader } from "@/components/shared/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PasskeyManagement } from "@/components/settings/passkey-management"
import { ChangePasswordCard } from "@/components/settings/change-password-card"
import { User, Settings, Shield, Bell, Key, ShieldCheck } from "lucide-react"

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
    <div className="space-y-6">
      <PageHeader
        heading="Settings"
        description="Manage your account settings, security and preferences"
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex flex-row items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm">General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-row items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm">Security & Privacy</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <ProfileForm user={user} isGoogleUser={isGoogleUser} />
          <AppearanceForm user={user} />
          <NotificationsSettingsCard />
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <PrivacyForm user={user} />
          {!isGoogleUser && <ChangePasswordCard user={user} />}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <ActiveSessionsCard user={user} initialSessions={activeSessions} />
            <PasskeyManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
