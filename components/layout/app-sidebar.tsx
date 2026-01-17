"use client"

import * as React from "react"
import { SidebarContent } from "@/components/layout/sidebar-content"

export function AppSidebar() {
  return (
    <div className="hidden lg:block fixed lg:sticky lg:top-14 inset-y-0 left-0 w-64 h-[calc(100vh-3.5rem)] bg-background/95 backdrop-blur-sm border-r border-border/40 shrink-0 z-40 lg:z-auto">
      <div className="h-full overflow-y-auto px-4 py-2">
        <SidebarContent />
      </div>
    </div>
  )
}
