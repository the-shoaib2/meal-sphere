"use client"
import { useMemo, useRef } from "react"
import { Utensils, Users, CreditCard, Bell, TrendingUp, Shield, Sparkles, DollarSign, Zap } from "lucide-react"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { usePublicData } from "@/hooks/use-public-data"
import { cn } from "@/lib/utils"

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
  Shield,
  DollarSign,
  Zap
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || Utensils
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 20 }}
      whileInView={{
        opacity: 1,
        y: 0,
        rotateX: 0,
        transition: {
          duration: 0.8,
          delay: index * 0.1,
          ease: [0.21, 0.47, 0.32, 0.98]
        }
      }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{
        y: -10,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="perspective-1000 group h-full"
    >
      <div
        className={cn(
          "relative h-full flex flex-col p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md",
          "hover:bg-white/[0.08] hover:border-primary/30 transition-all duration-500",
          "shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] group-hover:shadow-primary/20",
          "overflow-hidden"
        )}
      >
        {/* Animated background glow */}
        <div className="absolute -inset-24 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="size-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ring-1 ring-primary/20">
            <IconComponent className="size-8" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {feature.description}
            </p>
          </div>
        </div>

        {/* Decorative corner element */}
        <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity duration-500">
          <IconComponent className="size-20 transform translate-x-4 translate-y-4" />
        </div>
      </div>
    </motion.div>
  )
}

export default function FeaturesSection({ initialData }: { initialData?: FeaturesData | null }) {
  const { data } = usePublicData<FeaturesData>({ endpoint: "features", initialData })
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.1], [0.95, 1])

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative w-full overflow-hidden border-y py-24 lg:py-40"
    >
      {/* Decorative background removed */}

      <motion.div
        style={{ opacity, scale }}
        className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col items-center text-center space-y-8 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.2em]"
          >
            <Sparkles className="size-4 animate-pulse" />
            Empowering Your Living
          </motion.div>

          <div className="space-y-6 max-w-4xl">
            <h2 className="text-4xl sm:text-7xl font-black tracking-tighter text-foreground text-balance">
              {data?.title || "Premium Living Experience"}
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed font-medium">
              {data?.subtitle || "Everything you need to manage meals and costs with absolute clarity."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(data?.features || []).map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </motion.div>
    </section>
  )
} 