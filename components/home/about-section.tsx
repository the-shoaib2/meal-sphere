"use client"

import Image from "next/image"
import { motion } from "framer-motion"
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

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    }

    const staggerContainer = {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true },
        transition: { staggerChildren: 0.1 }
    }

    return (
        <section id="about" className="relative w-full overflow-hidden border-t">
            {/* Background elements - Subtle patterns */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--primary-rgb),0.03),transparent_50%)]" />

            <div className="relative bg-background">
                {/* Hero Section */}
                <div className="relative py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                    </div>

                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 left-0 w-32 lg:w-[20rem] bg-gradient-to-r to-transparent" />
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 right-0 w-32 lg:w-[20rem] bg-gradient-to-l to-transparent" />

                    <div className="max-w-7xl mx-auto text-center relative z-10">
                        <motion.div
                            {...fadeIn}
                            className="flex flex-col items-center gap-8"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold tracking-widest uppercase mb-4">
                                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors uppercase h-5 text-[10px] tracking-wider font-bold">New Era</Badge>
                                <span>Evolution of Community</span>
                            </div>
                            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tighter leading-[1.1]">
                                {data?.hero?.title || "Building Better Communities"}
                            </h2>
                            <p className="text-xl text-muted-foreground/80 max-w-2xl mx-auto text-balance font-light leading-relaxed">
                                {data?.hero?.subtitle || "MealSphere was born from a simple observation: shared living can be challenging, but it doesn't have to be."}
                            </p>
                            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/50 to-transparent my-4" />
                        </motion.div>
                    </div>
                </div>

                {/* Stats - Premium Glassmorphism */}
                <div className="pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 left-0 w-24 lg:w-40 bg-gradient-to-r to-transparent" />
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 right-0 w-24 lg:w-40 bg-gradient-to-l to-transparent" />
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            whileInView="whileInView"
                            viewport={{ once: true }}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                            {(data?.stats || Array.from({ length: 4 })).map((stat: any, i) => (
                                <motion.div
                                    key={stat?.label || i}
                                    variants={fadeIn}
                                    className="group relative p-8 rounded-3xl bg-secondary/30 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        {stat?.number ? (
                                            <div className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 tracking-tighter">
                                                {stat.number}
                                            </div>
                                        ) : (
                                            <div className="h-12 w-24 bg-muted animate-pulse rounded-lg" />
                                        )}
                                        <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] opacity-80 mt-2">
                                            {stat?.label || "Loading..."}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>

                {/* Story - Clean Layout & Immersive Background */}
                <div className="py-32 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden isolate">
                    {/* Blurry ambient background - Maximum blur and scale to eliminate edge visibility */}
                    <div className="absolute inset-0 -z-10 pointer-events-none select-none overflow-hidden">
                        <Image
                            src="/banner.png"
                            alt=""
                            fill
                            className="object-cover blur-[140px] opacity-20 dark:opacity-35 scale-[2.5] saturate-[1.8] mix-blend-multiply dark:mix-blend-soft-light"
                        />
                    </div>

                    <div className="from-background z-0 pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b to-transparent" />
                    <div className="from-background z-0 pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t to-transparent" />
                    <div className="from-background z-0 pointer-events-none absolute inset-y-0 left-0 w-80 lg:w-[30rem] bg-gradient-to-r to-transparent" />
                    <div className="from-background z-0 pointer-events-none absolute inset-y-0 right-0 w-80 lg:w-[40rem] bg-gradient-to-l via-background/60 to-transparent" />

                    <div className="max-w-7xl mx-auto relative z-20">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                            {/* Card Background - Subtle internal banner */}
                            <div className="absolute inset-0 -z-10 pointer-events-none select-none">
                                <Image
                                    src="/banner.png"
                                    alt=""
                                    fill
                                    className="object-cover blur-2xl opacity-[0.08] dark:opacity-[0.12] saturate-150"
                                />
                            </div>
                            <motion.div
                                {...fadeIn}
                                className="space-y-10"
                            >
                                <div className="space-y-4">
                                    <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter">{data?.story?.title || "Our Story"}</h3>
                                    <div className="h-2 w-16 bg-primary/40 rounded-full" />
                                </div>
                                <div className="space-y-6 text-lg text-muted-foreground/90 leading-relaxed font-light">
                                    {data?.story?.content?.slice(0, 2).map((paragraph, index) => (
                                        <p key={index}>{paragraph}</p>
                                    )) || <p className="animate-pulse"></p>}
                                </div>
                            </motion.div>

                            <motion.div
                                {...fadeIn}
                                className="relative"
                            >
                                <div className="relative aspect-[1/1] flex items-center justify-center">
                                    {/* Decorative elements - Dynamic glow */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[120%] rounded-[50%] bg-primary/20 blur-[100px] z-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-700" />

                                    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl shadow-primary/5">
                                        <Image
                                            src="/banner.png"
                                            alt="Our Story"
                                            fill
                                            className="object-cover relative z-10 select-none pointer-events-none"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Values - Luxury Interactive Grid */}
                <div className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 left-0 w-32 lg:w-48 bg-gradient-to-r to-transparent" />
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 right-0 w-32 lg:w-48 bg-gradient-to-l to-transparent" />
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            whileInView="whileInView"
                            viewport={{ once: true }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {(data?.values?.slice(0, 3) || Array.from({ length: 3 })).map((value: any, i) => {
                                const IconComponent = iconMap[value?.icon as keyof typeof iconMap] || Heart
                                return (
                                    <motion.div
                                        key={value?.title || i}
                                        variants={fadeIn}
                                        className="group relative p-10 rounded-[3rem] bg-background border border-border/60 hover:border-primary/30 transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(var(--primary-rgb),0.07)]"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[3rem]" />

                                        <div className="relative z-10">
                                            <div className="size-16 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform duration-500">
                                                <IconComponent className="size-8" />
                                            </div>
                                            {value?.title ? (
                                                <>
                                                    <h4 className="text-2xl font-bold mb-4 tracking-tight group-hover:text-primary transition-colors">{value.title}</h4>
                                                    <p className="text-muted-foreground/80 leading-relaxed font-light">
                                                        {value.description}
                                                    </p>
                                                </>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="h-8 w-3/4 bg-muted animate-pulse rounded-lg" />
                                                    <div className="h-20 w-full bg-muted animate-pulse rounded-lg" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    </div>
                </div>

                {/* Call to Action - Modern & High Impact */}
                <div className="py-24 px-4 sm:px-6 lg:px-8 bg-primary/[0.02] border-y border-border/60 overflow-hidden relative">
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 left-0 w-32 lg:w-48 bg-gradient-to-r to-transparent" />
                    <div className="from-background z-10 pointer-events-none absolute inset-y-0 right-0 w-32 lg:w-48 bg-gradient-to-l to-transparent" />

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                    <motion.div
                        {...fadeIn}
                        className="max-w-4xl mx-auto text-center space-y-12 relative z-10"
                    >
                        <div className="space-y-6">
                            <h3 className="text-4xl lg:text-6xl font-bold tracking-tighter leading-tight">
                                Ready to transform your shared living experience?
                            </h3>
                            <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto font-light">
                                Join thousands of satisfied users who have simplified their communal lives with MealSphere.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button size="lg" className="rounded-full px-12 h-16 text-lg font-bold shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 group">
                                Get Started Now
                                <Zap className="ml-2 size-5 group-hover:fill-current transition-all" />
                            </Button>
                            <Button variant="outline" size="lg" className="rounded-full px-12 h-16 text-lg font-medium backdrop-blur-sm border-border/60 hover:bg-secondary/50">
                                View Demo
                            </Button>
                        </div>
                    </motion.div>

                    <div className="absolute -bottom-24 -left-24 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute -top-24 -right-24 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
                </div>
            </div>
        </section>
    )
}
