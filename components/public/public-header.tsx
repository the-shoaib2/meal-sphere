"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, Utensils, Home } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useSession } from "next-auth/react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { NotificationBell } from "@/components/layout/notification-bell"
import { UserAvatar } from "@/components/auth/user-avatar"
import { handleNavigation } from "@/lib/utils"
import { useScrollSpy } from "@/hooks/use-scroll-spy"

const navLinks = [
  { name: 'Features', href: '/#features' },
  { name: 'Recipes', href: '/#recipes' },
  { name: 'Meal Plans', href: '/#meal-plans' },
  { name: 'About', href: '/#about' },
  { name: 'Contact', href: '/#contact' },
]

export function PublicHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const isMobile = useIsMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const activeSection = useScrollSpy(['features', 'recipes', 'meal-plans', 'about', 'contact'])
  const lastScrollY = useRef(0)

  useEffect(() => {
    let ticking = false

    const updateNavbar = () => {
      const currentScrollY = window.scrollY

      // Responsive hide/show logic with low threshold for "no latency" feel
      if (currentScrollY > lastScrollY.current && currentScrollY > 20) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      lastScrollY.current = currentScrollY
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNavbar)
        ticking = true
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', onScroll)
      }
    }
  }, [])

  // Check if a link is active
  const isActive = (href: string) => {
    if (!pathname) return false
    if (pathname !== '/') return false

    const sectionId = href.split('#')[1]
    return activeSection === sectionId
  }

  const navigateToSection = (href: string) => {
    if (pathname === '/') {
      const sectionId = href.split('#')[1]
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        setIsMenuOpen(false)
        return
      }
    }
    handleNavigation(href)
    setIsMenuOpen(false)
  }

  return (
    <header
      style={{ willChange: 'transform' }}
      className={cn(
        "fixed top-0 left-0 right-0 z-40 w-full bg-background transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="max-w-[1440px] mx-auto flex h-16 items-center justify-between px-2 md:px-4">
        <div className="flex items-center">
          <button
            onClick={() => handleNavigation('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Utensils className="h-8 w-8" />
            <span className="font-bold text-xl">Meal<span className="text-primary">Sphere</span></span>
          </button>
          <nav className="hidden md:flex items-center ml-8 space-x-2 text-sm font-medium">
            {navLinks.map((link) => (
              <Button
                key={link.name}
                onClick={() => navigateToSection(link.href)}
                variant={isActive(link.href) ? "secondary" : "ghost"}
                className={cn(
                  "rounded-full transition-all px-3",
                  isActive(link.href)
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.name}
              </Button>
            ))}
          </nav>
        </div>

        {session ? (
          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />
            <UserAvatar user={session.user} />
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="outline" className="rounded-full px-4" onClick={() => handleNavigation('/login')}>
              Sign in
            </Button>
            <Button variant="default" className="rounded-full px-4" onClick={() => handleNavigation('/register')}>
              Get Started
            </Button>
          </div>
        )}

        {isMobile && (
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[350px]">
              <div className="flex flex-col h-full">
                <SheetHeader className="text-left mb-6">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 space-y-6">
                  <div className="space-y-2">
                    {navLinks.map((link) => (
                      <Button
                        key={link.name}
                        onClick={() => navigateToSection(link.href)}
                        variant={isActive(link.href) ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start rounded-full transition-all",
                          isActive(link.href)
                            ? "bg-muted text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {link.name}
                      </Button>
                    ))}
                  </div>
                  <div className="pt-4 border-t space-y-3">
                    {session ? (
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-xl">
                          <UserAvatar user={session.user} />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold truncate max-w-[120px]">
                              {session?.user?.name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {session?.user?.email}
                            </span>
                          </div>
                        </div>
                        <Button className="w-full justify-start rounded-full" variant="outline" onClick={() => {
                          handleNavigation('/dashboard')
                          setIsMenuOpen(false)
                        }}>
                          <span className="flex items-center gap-2">
                            <Home />
                            Dashboard
                          </span>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" className="w-full rounded-full" asChild>
                          <Link href="/login" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                        </Button>
                        <Button className="w-full rounded-full" asChild>
                          <Link href="/register" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        )}

      </div>
    </header>
  )
}

