"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Utensils, Clock, Users, Star, ChefHat, BookOpen, Search, ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { usePublicData } from "@/hooks/use-public-data"

interface RecipesData {
    hero: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
    recipeCategories: Array<{
        name: string
        icon: string
        count: number
    }>
    featuredRecipes: Array<{
        id: number
        title: string
        description: string
        time: string
        servings: number
        difficulty: string
        rating: number
        image: string
        tags: string[]
    }>
    cta: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
}

export function RecipesSection({ initialData }: { initialData?: RecipesData | null }) {
    const { data, loading, error } = usePublicData<RecipesData>({ endpoint: "recipes", initialData })

    return (
        <section id="recipes" className="relative w-full overflow-hidden border-t">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb),0.05),transparent_50%)]" />

            <div className="relative bg-background">
                {/* Hero Section */}
                <div className="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
                                Culinary Excellence
                            </span>
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                                {data?.hero?.title || "Discover Amazing Recipes"}
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                                {data?.hero?.subtitle || "Explore our curated collection of delicious recipes perfect for shared living spaces."}
                            </p>
                            <div className="flex items-center gap-4 mt-4">
                                <Button
                                    asChild
                                    size="lg"
                                    className="rounded-full px-8 bg-primary hover:bg-primary/90 transition-all font-medium"
                                >
                                    <Link href="/recipes">Browse All</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories - Minimalist */}
                <div className="pb-16 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
                            {data?.recipeCategories?.map((category) => (
                                <button
                                    key={category.name}
                                    className="group flex flex-col items-center gap-4 p-6 rounded-[2rem] hover:bg-muted/50 transition-all border border-transparent hover:border-border min-w-[140px]"
                                >
                                    <div className="size-20 rounded-2xl bg-primary/5 flex items-center justify-center p-3 group-active:scale-95 transition-transform overflow-hidden">
                                        {category.icon.startsWith('/') ? (
                                            <img src={category.icon} alt={category.name} className="size-full object-contain transition-transform duration-300 group-hover:scale-110" />
                                        ) : (
                                            <span className="text-3xl">{category.icon}</span>
                                        )}
                                    </div>
                                    <span className="text-base font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                                        {category.name}
                                    </span>
                                </button>
                            )) || Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="animate-pulse flex flex-col items-center gap-3">
                                    <div className="size-12 rounded-xl bg-muted" />
                                    <div className="h-3 w-16 bg-muted rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Featured Recipes */}
                <div className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/20 relative">
                    {/* Fade Gradients similar to Hero */}
                    <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent" />
                    <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent" />

                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-end justify-between mb-12">
                            <div className="space-y-4">
                                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Our Favorites</h3>
                                <div className="h-1 w-12 bg-primary rounded-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {data?.featuredRecipes?.map((recipe) => (
                                <div key={recipe.id} className="group relative">
                                    <Card className="overflow-hidden border-none bg-background hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 rounded-3xl">
                                        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                                                <Utensils className="w-16 h-16 text-primary/20" />
                                            </div>
                                            <div className="absolute top-4 right-4 z-20">
                                                <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none px-3 py-1 rounded-full text-xs font-semibold">
                                                    {recipe.difficulty}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                                    <Clock className="size-3.5" />
                                                    {recipe.time}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                    <Users className="size-3.5" />
                                                    {recipe.servings} Servings
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300 line-clamp-1">
                                                {recipe.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-6 leading-relaxed">
                                                {recipe.description}
                                            </p>
                                            <Button variant="outline" className="w-full rounded-2xl group/btn border-muted-foreground/20 hover:border-primary hover:bg-primary/5">
                                                Details
                                                <ArrowRightIcon className="ml-2 size-4 transition-transform group-hover/btn:translate-x-1" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            )) || Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-[4/3] bg-muted rounded-3xl mb-4" />
                                    <div className="h-6 w-3/4 bg-muted rounded mb-2" />
                                    <div className="h-4 w-1/2 bg-muted rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
