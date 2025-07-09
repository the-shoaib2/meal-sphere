import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 400))

    const recipesData = {
      hero: {
        title: "Discover Amazing Recipes",
        subtitle: "Explore our curated collection of delicious recipes perfect for roommates and shared living spaces. From quick breakfasts to elaborate dinners, find inspiration for every meal.",
        ctaPrimary: {
          text: "Browse Recipes",
          href: "/recipes"
        },
        ctaSecondary: {
          text: "View Meal Plans",
          href: "/meal-plans"
        }
      },
      recipeCategories: [
        { name: "Breakfast", icon: "🌅", count: 45 },
        { name: "Lunch", icon: "☀️", count: 67 },
        { name: "Dinner", icon: "🌙", count: 89 },
        { name: "Snacks", icon: "🍎", count: 34 },
        { name: "Desserts", icon: "🍰", count: 23 },
        { name: "Beverages", icon: "☕", count: 28 }
      ],
      featuredRecipes: [
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
      ],
      cta: {
        title: "Ready to Start Cooking?",
        subtitle: "Join thousands of roommates who are already enjoying better meals together",
        ctaPrimary: {
          text: "Get Started Free",
          href: "/register"
        },
        ctaSecondary: {
          text: "Learn More",
          href: "/about"
        }
      }
    }

    return NextResponse.json(recipesData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recipes data' },
      { status: 500 }
    )
  }
} 