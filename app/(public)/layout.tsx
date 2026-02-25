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
    <div className="flex flex-col w-full">
      <LoadingBar />
      <PublicHeader />
      <main className="flex-1 w-full max-w-[1440px] mx-auto">
        {children}
        <PublicFooter />
      </main>
    </div>
  )
}
