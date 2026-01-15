import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { getServerAuthSession } from "@/lib/auth/auth"
import { LanguageProvider } from "@/contexts/language-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ToastProvider } from "@/components/providers/toast-provider"
import InternetStatusBanner from "@/components/internet-status-card"
import { LoadingBar } from "@/components/loading-bar"

// Force all routes to be dynamic - prevents build-time pre-rendering
export const dynamic = 'force-dynamic'
export const dynamicParams = true

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MealSphere - Meal Management System",
  description: "A comprehensive meal management system for roommates and hostels",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerAuthSession()
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} h-full flex flex-col`}>
        <SessionProvider session={session}>
          <QueryProvider>
            <ThemeProvider>
              <LanguageProvider>
                <NotificationProvider>
                  <>
                    <LoadingBar />
                    <InternetStatusBanner />
                    <div className="flex-1 flex flex-col">
                      {children}
                    </div>
                    <ToastProvider />
                  </>
                </NotificationProvider>
              </LanguageProvider>
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
