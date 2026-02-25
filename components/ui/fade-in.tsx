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

export function FadeIn({ children, delay = 0, duration = 0.6, className = "" }: FadeInProps) {
    // Use pathname as key to force re-render/re-animation on route change
    const pathname = usePathname()

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(10px)", y: -20 }}
            transition={{
                duration: duration,
                delay: delay,
                ease: [0.22, 1, 0.36, 1], // Custom easing for premium feel
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
