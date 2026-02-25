"use client"

import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { LoadingBar } from "@/components/shared/loading-bar"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col w-full min-h-full">
      <LoadingBar />
      <PublicHeader />
      <main className="flex-1 w-full">
        {children}
        <PublicFooter />
      </main>
    </div>
  )
}
