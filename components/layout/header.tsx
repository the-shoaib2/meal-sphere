"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, Utensils, Maximize2, Minimize2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

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
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-2 md:gap-4" suppressHydrationWarning>
        {/* Mobile Sidebar Trigger - Always visible */}
        <div className="lg:hidden flex-shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild suppressHydrationWarning>
              <Button variant="ghost" size="icon">
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
              </SheetHeader>
              <div className="h-full overflow-y-auto">
                <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Title - Hidden instantly when search opens, smooth fade-in when search closes */}
        <Link
          href="/"
          className={`items-center gap-2 font-semibold ${isMobile && isSearchExpanded
              ? 'hidden'
              : 'flex animate-in fade-in-0 slide-in-from-left-4 duration-300'
            } md:flex md:animate-none flex-shrink-0`}
        >
          <Utensils className="h-6 w-6 hidden md:block" />
          <span className="text-xl">MealSphere</span>
        </Link>

        {/* Search - Centered on desktop only */}
        <div className="hidden md:flex flex-1 justify-center">
          <HeaderSearch
            isMobile={false}
            isExpanded={false}
            onToggleExpand={() => { }}
          />
        </div>

        {/* Spacer for mobile when search is not expanded */}
        {isMobile && !isSearchExpanded && <div className="flex-1" />}

        {/* Search expanded on mobile - takes full width with animation */}
        <div className={`transition-all duration-300 ease-out ${isMobile && isSearchExpanded
          ? 'flex-1 opacity-100 translate-x-0'
          : 'w-0 opacity-0 translate-x-4 overflow-hidden md:hidden'
          } md:hidden`}>
          {isMobile && isSearchExpanded && (
            <HeaderSearch
              isMobile={true}
              isExpanded={isSearchExpanded}
              onToggleExpand={setIsSearchExpanded}
            />
          )}
        </div>
        {/* Right side actions - Always visible */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Fullscreen toggle - Desktop only */}
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

          {/* Search button - Mobile only, shown when not expanded with animation */}
          <div className={`transition-all duration-300 ease-out ${isMobile && !isSearchExpanded
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-4 w-0 overflow-hidden pointer-events-none'
            } md:hidden`}>
            {isMobile && !isSearchExpanded && (
              <HeaderSearch
                isMobile={true}
                isExpanded={false}
                onToggleExpand={setIsSearchExpanded}
              />
            )}
          </div>

          {/* Notification - Hidden on mobile when search is expanded with animation */}
          <div className={`transition-all duration-300 ease-out ${isMobile && isSearchExpanded
            ? 'opacity-0 translate-x-4 w-0 overflow-hidden pointer-events-none'
            : 'opacity-100 translate-x-0'
            }`}>
            <NotificationBell />
          </div>

          {/* User Avatar - Always visible */}
          <UserAvatar user={session?.user} />
        </div>
      </div>
    </header>
  )
}
