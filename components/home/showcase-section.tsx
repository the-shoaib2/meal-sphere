"use client"

import { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, useScroll, useTransform } from "framer-motion"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { usePublicData } from "@/hooks/use-public-data"
import Image from "next/image"

interface ShowcaseData {
  title: string
  subtitle: string
  screenshots: {
    desktop: {
      image: string
      alt: string
      label: string
    }
    mobile: {
      image: string
      alt: string
      label: string
    }
  }
}

export default function ShowcaseSection({ initialData }: { initialData?: ShowcaseData | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { data } = usePublicData<ShowcaseData>({ endpoint: "showcase", initialData })

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  })

  const maxWidth = useTransform(scrollYProgress, [0, 1], ["600px", "1200px"])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.7, 1])
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const mobileY = useTransform(scrollYProgress, [0, 1], [40, 0])

  const displayData: ShowcaseData = {
    title: data?.title || "See MealSphere in Action",
    subtitle: data?.subtitle || "Experience a seamless interface on both desktop and mobile. Designed for clarity, speed, and ease of use.",
    screenshots: {
      desktop: data?.screenshots?.desktop || {
        image: "/desktop-view.png",
        alt: "Desktop screenshot",
        label: "Desktop View",
      },
      mobile: data?.screenshots?.mobile || {
        image: "/phone-view.png",
        alt: "Mobile screenshot",
        label: "Mobile View",
      }
    }
  }

  return (
    <section ref={containerRef} className="w-full py-24 md:py-40 px-4 overflow-hidden bg-background/50 relative">
      <div className="max-w-7xl mx-auto flex flex-col items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mb-20 text-center space-y-4"
        >
          <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-foreground leading-[1.1]">
            {displayData.title}
          </h2>
          <p className="text-muted-foreground text-lg sm:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">
            {displayData.subtitle}
          </p>
        </motion.div>

        <div className="relative w-full flex items-center justify-center">
          {/* Main Desktop Frame */}
          <motion.div
            style={{ maxWidth, opacity, scale }}
            className="w-full transform-gpu relative z-0"
          >
            <div className="p-2 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-3xl">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-muted shadow-inner">
                <AspectRatio ratio={16 / 9}>
                  <Image
                    src={displayData.screenshots.desktop.image}
                    alt={displayData.screenshots.desktop.alt}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    priority
                  />
                </AspectRatio>
              </div>
            </div>
          </motion.div>

          {/* Floating Mobile Frame */}
          <motion.div
            style={{ y: mobileY, opacity }}
            initial={{ x: 100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="absolute -right-4 md:right-[10%] bottom-[-10%] md:bottom-[-20%] z-20 w-[180px] sm:w-[280px] group"
          >
            <div className="relative p-3 rounded-[3rem] bg-[#1a1a1a] border-[6px] border-[#333] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transform rotate-[-4deg] group-hover:rotate-0 transition-transform duration-700">
              {/* Speaker Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#333] rounded-b-2xl z-30" />

              <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.2rem] bg-black">
                <Image
                  src={displayData.screenshots.mobile.image}
                  alt={displayData.screenshots.mobile.alt}
                  fill
                  className="object-cover"
                  sizes="300px"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl bg-primary/10 blur-[180px] rounded-full -z-0 opacity-40" />
    </section>
  )
}