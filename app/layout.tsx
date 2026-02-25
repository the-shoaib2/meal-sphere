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
import InternetStatusBanner from "@/components/shared/internet-status-card"
import { LoadingBar } from "@/components/shared/loading-bar"


const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://meal-sphere.vercel.app"),
  title: "MealSphere - Meal Management System",
  description: "A comprehensive meal management system for roommates and hostels",
  openGraph: {
    title: "MealSphere - Meal Management System",
    description: "A comprehensive meal management system for roommates and hostels",
    url: "https://meal-sphere.vercel.app",
    siteName: "MealSphere",
    images: [
      {
        url: "/banner.jpg",
        width: 1200,
        height: 630,
        alt: "Meal Sphere Banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MealSphere - Meal Management System",
    description: "A comprehensive meal management system for roommates and hostels",
    images: ["/banner.jpg"],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerAuthSession()
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`} suppressHydrationWarning>
        <SessionProvider session={session}>
          <QueryProvider>
            <ThemeProvider>
              <LanguageProvider>
                <NotificationProvider>
                  <>
                    <LoadingBar />
                    <InternetStatusBanner />
                    <div className="flex-1 flex flex-col w-full bg-background">
                      <div className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto relative">
                        {children}
                      </div>
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
