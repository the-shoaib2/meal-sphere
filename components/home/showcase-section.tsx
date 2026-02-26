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
  }
}

export default function ShowcaseSection({ initialData }: { initialData?: ShowcaseData | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { data } = usePublicData<ShowcaseData>({ endpoint: "showcase", initialData })

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  })

  const maxWidth = useTransform(scrollYProgress, [0, 1], ["500px", "1440px"])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.7, 1])
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1])

  const displayData: ShowcaseData = {
    title: data?.title || "See MealSphere in Action",
    subtitle: data?.subtitle || "Experience a seamless interface on both desktop and mobile. Designed for clarity, speed, and ease of use.",
    screenshots: {
      desktop: data?.screenshots?.desktop || {
        image: "/desktop-view.png",
        alt: "Desktop screenshot",
        label: "Desktop View",
      }
    }
  }

  return (
    <section ref={containerRef} className="w-full py-10 md:py-20 px-4 overflow-hidden">
      <div className="w-full max-w-screen-2xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
            {displayData.title}
          </h2>
          <p className="text-muted-foreground md:text-xl max-w-4xl mx-auto px-4">
            {displayData.subtitle}
          </p>
        </motion.div>

        <div className="flex flex-col items-center justify-center w-full">
          {/* Desktop View Only */}
          <motion.div
            style={{ maxWidth, opacity, scale }}
            className="w-full transform-gpu"
          >
            <div className="relative">
              <Card className="relative overflow-hidden bg-transparent border-0 shadow-xl rounded-xl">
                <CardContent className="p-0">
                  <AspectRatio ratio={16 / 9} className="bg-muted overflow-hidden">
                    <Image
                      src={displayData.screenshots.desktop.image}
                      alt={displayData.screenshots.desktop.alt}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 1440px"
                      priority
                    />
                  </AspectRatio>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}