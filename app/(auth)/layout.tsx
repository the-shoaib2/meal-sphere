import type React from "react"
import { authOptions } from "@/lib/auth/auth"
import { getServerSession } from "next-auth"
import { LanguageProvider } from "@/contexts/language-context"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { GroupProvider } from "@/contexts/group-context"
import { redirect } from "next/navigation"
import { fetchGroupsData } from "@/lib/services/groups-service"
import { Group } from "@/hooks/use-groups"

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)

  // If no session, redirect to login
  if (!session) {
    redirect('/login?error=session_expired')
  }

  // Fetch groups server-side for GroupProvider
  let initialGroups: Group[] = [];
  let initialActiveGroup: Group | null = null;

  try {
    const groupsData = await fetchGroupsData(session.user.id);
    initialGroups = groupsData.myGroups || [];
    initialActiveGroup = groupsData.activeGroup || null;

    // If no active group but user has groups, auto-select the first one
    if (!initialActiveGroup && initialGroups.length > 0) {
      initialActiveGroup = initialGroups[0];
    }
  } catch (error) {
    console.error('Error fetching groups in layout:', error);
  }

  return (
    <GroupProvider initialGroups={initialGroups} initialActiveGroup={initialActiveGroup}>
      <div className="flex flex-col min-h-screen w-full">
        <Header />
        <div className="flex flex-1 max-w-7xl mx-auto w-full">
          <div className="flex flex-1 w-full">
            <AppSidebar />
            <main className="flex-1 bg-background overflow-auto">
              <div className="w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 min-w-0">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </GroupProvider>
  )
}
