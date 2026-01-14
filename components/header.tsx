"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Menu, Search, Utensils, Maximize2, Minimize2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { NotificationBell } from "./notification-bell"
import { useIsMobile } from "@/hooks/use-mobile"
import { UserAvatar } from "@/components/user-avatar"
import { AppSidebar } from "@/components/app-sidebar"
import { useEffect, useState } from "react"
import screenfull from "screenfull"

export function Header() {
  const { data: session } = useSession()
  const isMobile = useIsMobile()
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <Link href="/" className="flex items-center gap-2 font-semibold justify-center md:justify-start w-full md:w-auto">
          <Utensils className="h-6 w-6" />
          <span className="text-xl">MealSphere</span>
        </Link>
      </div>
      <div className="flex-1 flex justify-center">
        <form className="hidden rounded-full md:flex w-full max-w-[450px] ">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search meals, members, or rooms..."
              className="w-full appearance-none bg-background pl-9 pr-4 shadow-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
            />
          </div>
        </form>
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

        <UserAvatar user={session?.user as any} />
      </div>
    </header>
  )
}
