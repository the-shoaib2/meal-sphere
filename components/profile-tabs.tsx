"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/components/profile-form"
import { AppearanceForm } from "@/components/appearance-form"
import { LanguageForm } from "@/components/language-form"
import { SecurityForm } from "@/components/security-form"
import type { User } from "@prisma/client"
import { useIsMobile } from "@/hooks/use-mobile"

interface ProfileTabsProps {
  user: User
}

export function ProfileTabs({ user }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("profile")
  const isMobile = useIsMobile()

  return (
    <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid ${isMobile ? "grid-cols-2 gap-2" : "grid-cols-4"} mb-8`}>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        {isMobile ? (
          <>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </>
        ) : (
          <>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </>
        )}
      </TabsList>
      <TabsContent value="profile">
        <ProfileForm user={user} />
      </TabsContent>
      <TabsContent value="appearance">
        <AppearanceForm user={user} />
      </TabsContent>
      <TabsContent value="language">
        <LanguageForm user={user} />
      </TabsContent>
      <TabsContent value="security">
        <SecurityForm user={user} />
      </TabsContent>
    </Tabs>
  )
}
