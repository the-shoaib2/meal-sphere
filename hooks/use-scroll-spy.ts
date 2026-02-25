"use client"

import { useState, useEffect } from "react"

export function useScrollSpy(ids: string[], offset: number = 100) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset

      const selected = ids.find((id) => {
        const element = document.getElementById(id)
        if (!element) return false

        const { offsetTop, offsetHeight } = element
        return scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight
      })

      if (selected && selected !== activeId) {
        setActiveId(selected)
      } else if (!selected && window.scrollY < 100) {
        setActiveId("")
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => window.removeEventListener("scroll", handleScroll)
  }, [ids, offset, activeId])

  return activeId
}
