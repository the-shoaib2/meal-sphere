'use client';

import { ThemeProvider } from "@/components/providers/theme-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { LanguageProvider } from "@/contexts/language-context"
import { ToastProvider } from "@/components/providers/toast-provider"

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <LanguageProvider>
          <div className="min-h-full">
            {children}
          </div>
          <ToastProvider />
        </LanguageProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
