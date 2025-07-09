"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Utensils, Clock, Users, Star, ChefHat, BookOpen, Search } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
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

export default function RecipesPage() {
  const { data, loading, error } = usePublicData<RecipesData>({ endpoint: "recipes" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.02 }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Badge variant="secondary" className="mb-4 animate-pulse">
              <ChefHat className="w-4 h-4 mr-2" />
              Recipe Collection
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              {data?.hero?.title || "Discover Amazing Recipes"}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              {data?.hero?.subtitle || "Explore our curated collection of delicious recipes perfect for roommates and shared living spaces."}
            </p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
            >
              <Button size="lg" className="w-full sm:w-auto group">
                <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                {data?.hero?.ctaPrimary?.text || "Browse Recipes"}
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto group">
                <BookOpen className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                {data?.hero?.ctaSecondary?.text || "View Meal Plans"}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Recipe Categories */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={itemVariants}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Recipe Categories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find recipes organized by meal type, cuisine, and dietary preferences
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {data?.recipeCategories?.map((category, index) => (
              <motion.div
                key={category.name}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="text-center hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5">
                  <CardContent className="pt-6">
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center text-xl sm:text-2xl group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {category.icon}
                    </motion.div>
                    <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base group-hover:text-primary transition-colors">{category.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{category.count} recipes</p>
                  </CardContent>
                </Card>
              </motion.div>
            )) || Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="text-center hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5">
                  <CardContent className="pt-6">
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center text-xl sm:text-2xl group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      🍽️
                    </motion.div>
                    <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base group-hover:text-primary transition-colors">Loading...</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">0 recipes</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Featured Recipes */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={itemVariants}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Featured Recipes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Handpicked recipes that are perfect for shared living spaces
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {data?.featuredRecipes?.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20">
                  <motion.div 
                    className="h-32 sm:h-48 bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Utensils className="w-8 h-8 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform" />
                  </motion.div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors">{recipe.title}</CardTitle>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm ml-1">{recipe.rating}</span>
                      </div>
                    </div>
                    <CardDescription className="text-sm sm:text-base">{recipe.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {recipe.time}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        {recipe.servings} servings
                      </div>
                      <Badge variant="outline" className="text-xs">{recipe.difficulty}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                      {recipe.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full group" variant="outline">
                      <span className="group-hover:scale-105 transition-transform">View Recipe</span>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )) || Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20">
                  <motion.div 
                    className="h-32 sm:h-48 bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Utensils className="w-8 h-8 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform" />
                  </motion.div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors">Loading Recipe...</CardTitle>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm ml-1">0.0</span>
                      </div>
                    </div>
                    <CardDescription className="text-sm sm:text-base">Loading recipe description...</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        Loading...
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        0 servings
                      </div>
                      <Badge variant="outline" className="text-xs">Loading...</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">Loading...</Badge>
                    </div>
                    <Button className="w-full group" variant="outline">
                      <span className="group-hover:scale-105 transition-transform">View Recipe</span>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-primary"
      >
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl sm:text-3xl font-bold mb-4"
          >
            {data?.cta?.title || "Ready to Start Cooking?"}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90"
          >
            {data?.cta?.subtitle || "Join thousands of roommates who are already enjoying better meals together"}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
          >
            <Button size="lg" variant="secondary" className="w-full sm:w-auto group bg-white text-gray-800 hover:bg-gray-100">
              <span className="group-hover:scale-105 transition-transform">{data?.cta?.ctaPrimary?.text || "Get Started Free"}</span>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-800 w-full sm:w-auto group">
              <span className="group-hover:scale-105 transition-transform">{data?.cta?.ctaSecondary?.text || "Learn More"}</span>
            </Button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
} 