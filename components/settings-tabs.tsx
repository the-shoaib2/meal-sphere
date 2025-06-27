"use client"

import { useState, useEffect } from "react"
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
  
  // Get the active tab from URL search params, default to 'profile'
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams?.get('tab');
    return tabFromUrl && ['profile', 'appearance', 'language', 'security'].includes(tabFromUrl) 
      ? tabFromUrl 
      : 'profile';
  });

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && ['profile', 'appearance', 'language', 'security'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

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

