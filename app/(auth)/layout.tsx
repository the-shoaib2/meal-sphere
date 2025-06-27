import type React from "react"
import { authOptions } from "@/lib/auth/auth"
import { getServerSession } from "next-auth"
import { LanguageProvider } from "@/contexts/language-context"
import { ToastProvider } from "@/components/providers/toast-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/header"
import { GroupProvider } from "@/contexts/group-context"
import { redirect } from "next/navigation"

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)
  
  // If no session, redirect to login instead of throwing error
  // This handles the transition from JWT to database sessions
  if (!session) {
    redirect('/login?error=session_expired')
  }

  return (
    <GroupProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider>
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <SidebarInset className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {children}
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
      <ToastProvider />
    </GroupProvider>
  )
}
