"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/components/profile-form"
import { AppearanceForm } from "@/components/appearance-form"
import { LanguageForm } from "@/components/language-form"
import { SecurityForm } from "@/components/security-form"
import type { User } from "@prisma/client"

interface SettingsTabsProps {
  user: User
}

export function SettingsTabs({ user }: SettingsTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL or default to "profile"
  const getInitialTab = () => {
    if (searchParams) {
      const tabFromUrl = searchParams.get("tab")
      if (tabFromUrl && ["profile", "appearance", "language", "security"].includes(tabFromUrl)) {
        return tabFromUrl
      }
    }
    return "profile"
  }
  
  const [activeTab, setActiveTab] = useState(getInitialTab())

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("tab", value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        <TabsTrigger value="language">Language</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
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

