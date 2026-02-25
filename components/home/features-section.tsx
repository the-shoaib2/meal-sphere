"use client"
import { Utensils, Users, CreditCard, Bell, TrendingUp, Shield } from "lucide-react"
import { motion } from "framer-motion"
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

export default function FeaturesSection({ initialData }: { initialData?: FeaturesData | null }) {
  const { data, error } = usePublicData<FeaturesData>({ endpoint: "features", initialData })


  if (error || !data) {
    return (
      <section className="w-full py-8 md:py-12 lg:py-16 dark:bg-gray-800 px-4 sm:px-6">
        <div className="mx-auto">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Key Features</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Everything you need to manage meals and costs in shared living spaces
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {/* Fallback features */}
            {[
              { title: "Meal Tracking", description: "Track daily meals with ease", icon: Utensils },
              { title: "Room Management", description: "Create rooms and manage members", icon: Users },
              { title: "Payment Integration", description: "Integrated payment system", icon: CreditCard },
              { title: "Notifications", description: "Get timely reminders", icon: Bell },
              { title: "Cost Calculation", description: "Automatic calculations", icon: TrendingUp },
              { title: "Role-Based Access", description: "Different access levels", icon: Shield }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
              >
                <div className="rounded-full bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full py-8 md:py-12 lg:py-16 dark:bg-gray-800 px-4 sm:px-6">
      <div className="mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">{data.title}</h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              {data.subtitle}
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {data.features.map((feature, index) => {
            const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || Utensils

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm transition-transform duration-300 hover:scale-105 hover:shadow-lg bg-muted dark:bg-gray-900/80"
              >
                <div className="rounded-full bg-primary/10 p-3">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
} 