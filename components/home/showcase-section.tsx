"use client"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { usePublicData } from "@/hooks/use-public-data"

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
  const { data, error } = usePublicData<ShowcaseData>({ endpoint: "showcase", initialData })


  if (error || !data || !data.screenshots || !data.screenshots.desktop || !data.screenshots.mobile) {
    return (
      <section className="w-full py-10 md:py-20 bg-background px-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="mb-10 text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
              See MealSphere in Action
            </h2>
            <p className="text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Experience a seamless interface on both desktop and mobile. Designed for clarity, speed, and ease of use.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-10 items-center justify-center w-full">
            {/* Desktop View */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0 }}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)" }}
              className="w-full md:w-2/3 max-w-2xl cursor-pointer"
            >
              <div className="relative">
                <div className="bg-gray-800 rounded-lg p-2 shadow-2xl">
                  <Card className="overflow-hidden transition-all duration-300 bg-white/90 dark:bg-gray-900/80 border-0 shadow-none rounded-md">
                    <CardContent className="p-0">
                      <AspectRatio ratio={16 / 9} className="bg-muted rounded-md">
                        <img
                          src="/Screenshot-desktop.png"
                          alt="Desktop view screenshot"
                          className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-105"
                          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.10))" }}
                        />
                      </AspectRatio>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="text-center mt-3 text-muted-foreground font-semibold text-base sm:text-lg">Desktop View</div>
            </motion.div>
            {/* Phone View */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              whileHover={{ scale: 1.06, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.22)" }}
              className="w-full max-w-[260px] md:w-[220px] cursor-pointer"
            >
              <div className="relative">
                <div className="bg-gray-800 rounded-2xl p-1.5 shadow-2xl">
                  <Card className="overflow-hidden transition-all duration-300 dark:bg-gray-900/80 border-0 shadow-none rounded-xl">
                    <CardContent className="p-0">
                      <AspectRatio ratio={9 / 18} className="bg-muted rounded-xl">
                        <img
                          src="/Screenshot-phone.png"
                          alt="Phone view screenshot"
                          className="w-full h-full object-cover object-top rounded-xl transition-transform duration-300 hover:scale-105"
                          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }}
                        />
                      </AspectRatio>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="bg-transparent text-center mt-3 text-muted-foreground font-semibold text-base sm:text-lg">Phone View</div>
            </motion.div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full py-10 md:py-20 bg-background px-2 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="mb-10 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
            {data.title}
          </h2>
          <p className="text-muted-foreground md:text-xl max-w-2xl mx-auto">
            {data.subtitle}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-10 items-center justify-center w-full">
          {/* Desktop View */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0 }}
            whileHover={{ scale: 1.03, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)" }}
            className="w-full md:w-2/3 max-w-2xl cursor-pointer"
          >
            <div className="relative">
              <div className="bg-gray-800 rounded-lg p-2 shadow-2xl">
                <Card className="overflow-hidden transition-all duration-300 bg-white/90 dark:bg-gray-900/80 border-0 shadow-none rounded-md">
                  <CardContent className="p-0">
                    <AspectRatio ratio={16 / 9} className="bg-muted rounded-md">
                      <img
                        src={data.screenshots.desktop.image}
                        alt={data.screenshots.desktop.alt}
                        className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-105"
                        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.10))" }}
                      />
                    </AspectRatio>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="text-center mt-3 text-muted-foreground font-semibold text-base sm:text-lg">
              {data.screenshots.desktop.label}
            </div>
          </motion.div>
          {/* Phone View */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            whileHover={{ scale: 1.06, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.22)" }}
            className="w-full max-w-[260px] md:w-[220px] cursor-pointer"
          >
            <div className="relative">
              <div className="bg-gray-800 rounded-2xl p-1.5 shadow-2xl">
                <Card className="overflow-hidden transition-all duration-300 dark:bg-gray-900/80 border-0 shadow-none rounded-xl">
                  <CardContent className="p-0">
                    <AspectRatio ratio={9 / 18} className="bg-muted rounded-xl">
                      <img
                        src={data.screenshots.mobile.image}
                        alt={data.screenshots.mobile.alt}
                        className="w-full h-full object-cover object-top rounded-xl transition-transform duration-300 hover:scale-105"
                        style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }}
                      />
                    </AspectRatio>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="bg-transparent text-center mt-3 text-muted-foreground font-semibold text-base sm:text-lg">
              {data.screenshots.mobile.label}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 