import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { authOptions } from "@/lib/auth/auth"
import { getServerSession } from "next-auth"
import { LanguageProvider } from "@/contexts/language-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ToastProvider } from "@/components/providers/toast-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MealSphere - Meal Management System",
  description: "A comprehensive meal management system for roommates and hostels",
  generator: ''
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} h-full flex flex-col`}>
        <SessionProvider session={session}>
          <ThemeProvider>
            <LanguageProvider>
              <NotificationProvider>
                <div className="flex h-screen w-full overflow-hidden">
                  <SidebarProvider>
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <Header />
                      <SidebarInset className="flex-1 flex flex-col">
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
              </NotificationProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
