"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function LoadingBar() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Complete the progress bar when route changes
    if (isLoading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (isLoading) {
      // Smoother and faster initial progress
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          // Fast start, then slow down
          const remaining = 90 - prev
          const increment = Math.max(1, remaining / 10)
          return prev + increment
        })
      }, 20)
      return () => clearInterval(timer)
    }
  }, [isLoading])

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true)
      setProgress(10) // Immediate feedback
    }

    window.addEventListener('routeChangeStart', handleStart)
    return () => window.removeEventListener('routeChangeStart', handleStart)
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none">
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1
        }}
      />
    </div>
  )
}