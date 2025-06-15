'use client';

import { ThemeProvider } from "@/components/providers/theme-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { LanguageProvider } from "@/contexts/language-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { ToastProvider } from "@/components/providers/toast-provider"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - MealSphere",
  description: "Login to your MealSphere account",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <LanguageProvider>
          <NotificationProvider>
            <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
              <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Sign in to your account
                </p>
              </div>
              <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10">
                  {children}
                </div>
              </div>
            </div>
            <ToastProvider />
          </NotificationProvider>
        </LanguageProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
