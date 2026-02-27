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
import { User, Settings, Shield, Bell, Key } from "lucide-react"

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

      <Tabs defaultValue="profile" className="w-full">
        {/* Tab bar: 5 columns on sm+, icon-only on mobile */}
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex flex-row items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex flex-row items-center gap-2">
            <Settings className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex flex-row items-center gap-2">
            <Shield className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-row items-center gap-2">
            <Key className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-row items-center gap-2">
            <Bell className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm user={user} isGoogleUser={isGoogleUser} />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceForm user={user} />
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <PrivacyForm user={user} />
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <ActiveSessionsCard user={user} initialSessions={activeSessions} />
            <PasskeyManagement />
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
