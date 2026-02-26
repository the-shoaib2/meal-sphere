"use client"
import { Utensils, Users, CreditCard, Bell, TrendingUp, Shield, Sparkles } from "lucide-react"
import { motion, Variants } from "framer-motion"
import { usePublicData } from "@/hooks/use-public-data"

interface Feature {
  id: number
  title: string
  description: string
  icon: string
}

interface FeaturesData {
  title: string
  subtitle: string
  features: Feature[]
}

const iconMap = {
  Utensils,
  Users,
  CreditCard,
  Bell,
  TrendingUp,
  Shield
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemFadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
}

export default function FeaturesSection({ initialData }: { initialData?: FeaturesData | null }) {
  const { data, loading } = usePublicData<FeaturesData>({ endpoint: "features", initialData })

  return (
    <section id="features" className="relative w-full overflow-hidden border-y bg-background/50 py-24 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(var(--primary-rgb),0.03),transparent_50%)]" />

      {/* Horizontal Fades */}
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r to-transparent lg:w-48" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l to-transparent lg:w-48" />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-6 mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider"
          >
            <Sparkles className="size-3.5" />
            Empowering Your Living
          </motion.div>

          <div className="space-y-4 max-w-3xl">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              {data?.title || "Key Features"}
            </h2>
            <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
              {data?.subtitle || "Everything you need to manage meals and costs in shared living spaces with absolute clarity and ease."}
            </p>
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4"
        >
          {(data?.features || Array.from({ length: 6 })).map((feature, index) => {
            const featureTyped = feature as Feature | undefined
            const IconComponent = featureTyped ? (iconMap[featureTyped.icon as keyof typeof iconMap] || Utensils) : null

            return (
              <motion.div
                key={featureTyped?.id || index}
                variants={itemFadeUp}
                className="h-full"
              >
                <div className="relative h-full flex flex-col p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all duration-300 shadow-sm hover:shadow-md">
                  <div className="mb-4">
                    <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-colors">
                      {IconComponent ? <IconComponent className="size-6" /> : <div className="size-6 bg-muted animate-pulse rounded" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {featureTyped?.title || <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {featureTyped?.description || <div className="h-12 w-full bg-muted animate-pulse rounded" />}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
} 