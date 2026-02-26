"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Utensils, Clock, Users, Star, ChefHat, BookOpen, Search, ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
                <div className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/5 relative">
                    {/* Fade Gradients similar to Hero */}
                    <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent" />
                    <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />

                    <div className="max-w-7xl mx-auto relative">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                            <div className="space-y-4">
                                <span className="text-primary text-sm font-semibold tracking-wider uppercase bg-primary/10 px-4 py-1.5 rounded-full">
                                    Chef's Choice
                                </span>
                                <h3 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                                    Our Favorites
                                </h3>
                                <p className="text-muted-foreground max-w-lg text-pretty">
                                    A hand-picked selection of our most loved recipes, tried and tested by our community.
                                </p>
                            </div>
                            <Button variant="ghost" className="group/all w-fit rounded-full hover:bg-primary/5 text-primary font-semibold" asChild>
                                <Link href="/recipes">
                                    View All Recipes
                                    <ArrowRightIcon className="ml-2 size-4 transition-transform group-hover/all:translate-x-1" />
                                </Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {data?.featuredRecipes?.map((recipe) => (
                                <div key={recipe.id} className="group h-full">
                                    <Card className="h-full flex flex-col overflow-hidden border-none bg-background/60 backdrop-blur-xl hover:bg-background transition-all duration-500 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/20">
                                        <div className="relative aspect-[16/11] overflow-hidden">
                                            {recipe.image ? (
                                                <Image
                                                    src={recipe.image}
                                                    alt={recipe.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                                                    <Utensils className="w-16 h-16 text-primary/20" />
                                                </div>
                                            )}

                                            {/* Rating Overlay */}
                                            <div className="absolute top-5 left-5 z-20">
                                                <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm border border-white/20">
                                                    <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-xs font-bold">{recipe.rating}</span>
                                                </div>
                                            </div>

                                            {/* Difficulty Overlay */}
                                            <div className="absolute top-5 right-5 z-20">
                                                <Badge className="bg-primary/90 hover:bg-primary text-white border-none px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                                                    {recipe.difficulty}
                                                </Badge>
                                            </div>

                                            {/* Hover Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        </div>

                                        <CardHeader className="space-y-4 pt-8 px-8 pb-4">
                                            <div className="flex items-center gap-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/50">
                                                    <Clock className="size-3.5 text-primary" />
                                                    {recipe.time}
                                                </div>
                                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/50">
                                                    <Users className="size-3.5 text-primary" />
                                                    {recipe.servings} Servings
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                                                {recipe.title}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className="px-8 pb-8 flex-grow flex flex-col justify-between">
                                            <p className="text-muted-foreground line-clamp-2 mb-8 text-sm leading-relaxed">
                                                {recipe.description}
                                            </p>
                                            <Button className="w-full h-12 rounded-2xl bg-foreground text-background hover:bg-primary hover:text-white transition-all duration-300 font-semibold group/btn overflow-hidden relative" asChild>
                                                <Link href={`/recipes/${recipe.id}`}>
                                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                                        View Recipe
                                                        <ArrowRightIcon className="size-4 transition-transform group-hover/btn:translate-x-1" />
                                                    </span>
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            )) || Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-[16/11] bg-muted rounded-[2.5rem] mb-6 shadow-sm" />
                                    <div className="space-y-3 px-4">
                                        <div className="h-4 w-1/4 bg-muted rounded-full" />
                                        <div className="h-8 w-3/4 bg-muted rounded-2xl" />
                                        <div className="h-4 w-full bg-muted rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
