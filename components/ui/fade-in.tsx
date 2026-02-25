"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"

interface FadeInProps {
    children: ReactNode
    delay?: number
    duration?: number
    className?: string
}

export function FadeIn({ children, delay = 0, duration = 0.08, className = "" }: FadeInProps) {
    // Use pathname as key to force re-render/re-animation on route change
    const pathname = usePathname()

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, filter: "blur(1px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(1px)" }}
            transition={{
                duration: duration,
                delay: delay,
                ease: "easeOut",
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
