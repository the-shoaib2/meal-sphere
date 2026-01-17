"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Menu, Search, Utensils, Maximize2, Minimize2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { NotificationBell } from "./notification-bell"
import { useIsMobile } from "@/hooks/use-mobile"
import { UserAvatar } from "@/components/auth/user-avatar"
import { SidebarContent } from "@/components/layout/sidebar-content"
import { useEffect, useState } from "react"
import screenfull from "screenfull"

import { HeaderSearch } from "@/components/layout/header-search"

export function Header() {
  const { data: session } = useSession()
  const isMobile = useIsMobile()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (screenfull.isEnabled) {
      const handleChange = () => setIsFullscreen(screenfull.isFullscreen)
      screenfull.on('change', handleChange)
      return () => screenfull.off('change', handleChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (screenfull.isEnabled) {
      if (screenfull.isFullscreen) {
        screenfull.exit()
      } else {
        screenfull.request(document.documentElement)
      }
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center backdrop-blur-md border-b border-border/40" suppressHydrationWarning>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-4" suppressHydrationWarning>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Sidebar Trigger */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild suppressHydrationWarning>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SheetHeader className="px-4 py-4 border-b">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Utensils className="h-5 w-5" />
                    MealSphere
                  </SheetTitle>
                  {/* <SheetDescription className="sr-only">
                    Mobile navigation menu
                  </SheetDescription> */}
                </SheetHeader>
                <div className="h-full overflow-y-auto">
                  <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Link href="/" className="flex items-center gap-2 font-semibold justify-center md:justify-start w-full md:w-auto">
            <Utensils className="h-6 w-6 hidden md:block" />
            <span className="text-xl">MealSphere</span>
          </Link>
        </div>
        <div className="flex-1 flex justify-center">
          <HeaderSearch />
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden md:flex"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
            <span className="sr-only">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
          </Button>

          <NotificationBell />

          <UserAvatar user={session?.user} />
        </div>
      </div>
    </header>
  )
}
