"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Users, Target, Award, Globe, Zap, Shield, Star } from "lucide-react"
import { usePublicData } from "@/hooks/use-public-data"

interface AboutData {
    hero: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
    stats: Array<{ number: string; label: string }>
    story: {
        title: string
        content: string[]
    }
    mission: {
        title: string
        description: string
    }
    vision: {
        title: string
        description: string
    }
    values: Array<{
        title: string
        description: string
        icon: string
    }>
    team: Array<{
        name: string
        role: string
        bio: string
        image: string
        linkedin: string
    }>
    cta: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
}

const iconMap = {
    Heart,
    Users,
    Target,
    Shield,
    Zap,
    Globe
}

export function AboutSection({ initialData }: { initialData?: AboutData | null }) {
    const { data, loading, error } = usePublicData<AboutData>({ endpoint: "about", initialData })

    return (
        <section id="about" className="relative w-full overflow-hidden border-t">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.05),transparent_50%)]" />

            <div className="relative bg-background">
                {/* Hero Section */}
                <div className="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
                                Our Mission
                            </span>
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                                {data?.hero?.title || "Building Better Communities"}
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                                {data?.hero?.subtitle || "MealSphere was born from a simple observation: shared living can be challenging, but it doesn't have to be."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats - Elegant & Minimal */}
                <div className="pb-20 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 sm:gap-16">
                            {data?.stats?.map((stat) => (
                                <div key={stat.label} className="flex flex-col items-center gap-2">
                                    <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{stat.number}</div>
                                    <div className="text-xs font-medium text-primary uppercase tracking-widest">{stat.label}</div>
                                </div>
                            )) || Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="animate-pulse flex flex-col items-center gap-2">
                                    <div className="h-10 w-20 bg-muted rounded" />
                                    <div className="h-3 w-16 bg-muted rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Story - Clean Layout */}
                <div className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/20 relative">
                    <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent" />
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-bold tracking-tight">{data?.story?.title || "Our Story"}</h3>
                                    <div className="h-1.5 w-12 bg-primary rounded-full" />
                                </div>
                                <div className="space-y-6 text-muted-foreground leading-relaxed">
                                    {data?.story?.content?.slice(0, 2).map((paragraph, index) => (
                                        <p key={index}>{paragraph}</p>
                                    )) || <p>Loading story content...</p>}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/10 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1),transparent_70%)] group-hover:scale-110 transition-transform duration-700" />
                                    <Users className="w-24 h-24 text-primary relative z-10" />
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute -top-4 -right-4 size-24 rounded-full bg-primary/5 blur-2xl" />
                                <div className="absolute -bottom-4 -left-4 size-32 rounded-full bg-primary/5 blur-3xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Values - Luxury Grid */}
                <div className="py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {data?.values?.slice(0, 3).map((value) => {
                                const IconComponent = iconMap[value.icon as keyof typeof iconMap] || Heart
                                return (
                                    <div key={value.title} className="group p-8 rounded-[2.5rem] bg-background border border-border hover:border-primary/20 hover:shadow-[0_15px_40px_rgba(0,0,0,0.04)] transition-all duration-500">
                                        <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-6 group-hover:bg-primary/10 transition-colors">
                                            <IconComponent className="size-6" />
                                        </div>
                                        <h4 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{value.title}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                            {value.description}
                                        </p>
                                    </div>
                                )
                            }) || Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-48 rounded-[2.5rem] bg-muted animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Call to Action - Minimalist */}
                <div className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5 border-y border-primary/10">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <h3 className="text-3xl font-bold tracking-tight">Ready to transform your shared living?</h3>
                        <Button size="lg" className="rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
                            Get Started Now
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
