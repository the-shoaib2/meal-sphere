"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Utensils, Clock, Users, Star, ChefHat, BookOpen, Search } from "lucide-react"
import Link from "next/link"

export default function RecipesPage() {
  const recipeCategories = [
    { name: "Breakfast", icon: "🌅", count: 45 },
    { name: "Lunch", icon: "☀️", count: 67 },
    { name: "Dinner", icon: "🌙", count: 89 },
    { name: "Snacks", icon: "🍎", count: 34 },
    { name: "Desserts", icon: "🍰", count: 23 },
    { name: "Beverages", icon: "☕", count: 28 },
  ]

  const featuredRecipes = [
    {
      id: 1,
      title: "Spicy Chicken Biryani",
      description: "Aromatic rice dish with tender chicken and fragrant spices",
      time: "45 min",
      servings: 4,
      difficulty: "Medium",
      rating: 4.8,
      image: "/placeholder.jpg",
      tags: ["Indian", "Rice", "Spicy"]
    },
    {
      id: 2,
      title: "Mediterranean Salad",
      description: "Fresh vegetables with olive oil and herbs",
      time: "15 min",
      servings: 2,
      difficulty: "Easy",
      rating: 4.6,
      image: "/placeholder.jpg",
      tags: ["Healthy", "Vegetarian", "Quick"]
    },
    {
      id: 3,
      title: "Chocolate Lava Cake",
      description: "Decadent chocolate cake with molten center",
      time: "25 min",
      servings: 2,
      difficulty: "Hard",
      rating: 4.9,
      image: "/placeholder.jpg",
      tags: ["Dessert", "Chocolate", "Romantic"]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <ChefHat className="w-4 h-4 mr-2" />
              Recipe Collection
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              Discover Amazing
              <span className="text-primary"> Recipes</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              Explore our curated collection of delicious recipes perfect for roommates and shared living spaces. 
              From quick breakfasts to elaborate dinners, find inspiration for every meal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto">
                <Search className="w-5 h-5 mr-2" />
                Browse Recipes
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <BookOpen className="w-5 h-5 mr-2" />
                View Meal Plans
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Categories */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Recipe Categories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find recipes organized by meal type, cuisine, and dietary preferences
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {recipeCategories.map((category) => (
              <Card key={category.name} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center text-xl sm:text-2xl">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">{category.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{category.count} recipes</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Recipes */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Featured Recipes</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Handpicked recipes that are perfect for shared living spaces
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredRecipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-32 sm:h-48 bg-primary/10 flex items-center justify-center">
                  <Utensils className="w-8 h-8 sm:w-16 sm:h-16 text-primary" />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base sm:text-lg">{recipe.title}</CardTitle>
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
                  <Button className="w-full" variant="outline">
                    View Recipe
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Start Cooking?</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
            Join thousands of roommates who are already enjoying better meals together
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
} 