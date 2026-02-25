"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Calendar, Users, ShoppingCart, ChefHat, Clock, Star, Zap } from "lucide-react"
import Link from "next/link"
import { usePublicData } from "@/hooks/use-public-data"

interface MealPlansData {
    hero: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
    features: Array<{
        title: string
        description: string
        icon: string
    }>
    mealPlanTypes: Array<{
        name: string
        description: string
        icon: string
        features: string[]
    }>
    pricingTiers: Array<{
        name: string
        price: string
        period: string
        description: string
        features: string[]
        popular: boolean
    }>
    cta: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
}

const iconMap = {
    Users,
    ShoppingCart,
    ChefHat,
    Clock,
    Zap,
    Star,
    Calendar
}

export function MealPlansSection({ initialData }: { initialData?: MealPlansData | null }) {
    const { data, loading, error } = usePublicData<MealPlansData>({ endpoint: "meal-plans", initialData })

    return (
        <section id="meal-plans" className="relative w-full overflow-hidden border-t">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(var(--primary-rgb),0.05),transparent_50%)]" />

            <div className="relative bg-background">
                {/* Hero Section */}
                <div className="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
                                Seamless Coordination
                            </span>
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                                {data?.hero?.title || "Plan Meals Together Smarter"}
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                                {data?.hero?.subtitle || "Coordinate meals with your roommates, save money, and never wonder what's for dinner again."}
                            </p>
                            <div className="flex items-center gap-4 mt-6">
                                <Button
                                    asChild
                                    size="lg"
                                    className="rounded-full px-8 bg-primary hover:bg-primary/90 transition-all font-medium"
                                >
                                    <Link href="/register">Get Started</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features - Minimalist */}
                <div className="pb-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {data?.features?.map((feature) => {
                                const IconComponent = iconMap[feature.icon as keyof typeof iconMap] || Users
                                return (
                                    <div key={feature.title} className="group relative flex flex-col items-center text-center gap-6 p-2">
                                        <div className="size-16 rounded-3xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-500">
                                            <IconComponent className="size-8 text-primary group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                                                {feature.title}
                                            </h3>
                                            <p className="text-muted-foreground leading-relaxed text-sm max-w-[280px]">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                )
                            }) || Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="animate-pulse flex flex-col items-center gap-4">
                                    <div className="size-16 rounded-3xl bg-muted" />
                                    <div className="h-4 w-32 bg-muted rounded" />
                                    <div className="h-3 w-48 bg-muted rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Meal Plan Types - Luxury Cards */}
                <div className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20 relative">
                    <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent" />
                    <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent" />

                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col items-center text-center gap-4 mb-16">
                            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Tailored Experience</h3>
                            <div className="h-1.5 w-16 bg-primary rounded-full" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {data?.mealPlanTypes?.map((plan) => {
                                const IconComponent = iconMap[plan.icon as keyof typeof iconMap] || Calendar
                                return (
                                    <Card key={plan.name} className="group overflow-hidden border-none bg-background hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-[2.5rem] p-8">
                                        <div className="flex flex-col gap-6">
                                            <div className="size-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                                <IconComponent className="size-7" />
                                            </div>
                                            <div className="space-y-4">
                                                <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                                                    {plan.name}
                                                </CardTitle>
                                                <CardDescription className="text-muted-foreground text-sm leading-relaxed">
                                                    {plan.description}
                                                </CardDescription>
                                            </div>
                                            <ul className="space-y-3 pt-4">
                                                {plan.features.slice(0, 3).map((feature) => (
                                                    <li key={feature} className="flex items-center gap-3 text-sm text-foreground/80 font-medium">
                                                        <div className="size-1.5 rounded-full bg-primary" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </Card>
                                )
                            }) || Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="animate-pulse bg-background rounded-[2.5rem] p-8 h-[300px]">
                                    <div className="size-14 rounded-2xl bg-muted mb-6" />
                                    <div className="h-6 w-3/4 bg-muted rounded mb-4" />
                                    <div className="h-4 w-full bg-muted rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
