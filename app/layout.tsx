import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { authOptions } from "@/lib/auth/auth"
import { getServerSession } from "next-auth"
import { LanguageProvider } from "@/contexts/language-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ToastProvider } from "@/components/providers/toast-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MealSphere - Meal Management System",
  description: "A comprehensive meal management system for roommates and hostels",
  generator: 'v0.dev'
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
          <QueryProvider>
            <ThemeProvider>
              <LanguageProvider>
                <NotificationProvider>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {children}
                  </div>
                  <ToastProvider />
                </NotificationProvider>
              </LanguageProvider>
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
