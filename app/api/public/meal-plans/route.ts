import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 500))

    const mealPlansData = {
      hero: {
        title: "Plan Meals Together Smarter",
        subtitle: "Coordinate meals with your roommates, save money on groceries, and never wonder what's for dinner again. Our collaborative meal planning makes shared living delicious and efficient.",
        ctaPrimary: {
          text: "Start Planning",
          href: "/register"
        },
        ctaSecondary: {
          text: "Invite Roommates",
          href: "/register"
        }
      },
      features: [
        {
          title: "Collaborative Planning",
          description: "Plan meals together with your roommates in real-time",
          icon: "Users"
        },
        {
          title: "Smart Shopping Lists",
          description: "Automatically generate shopping lists from your meal plans",
          icon: "ShoppingCart"
        },
        {
          title: "Recipe Integration",
          description: "Access thousands of recipes and add them to your plans",
          icon: "ChefHat"
        },
        {
          title: "Time Management",
          description: "Plan cooking times and coordinate kitchen schedules",
          icon: "Clock"
        },
        {
          title: "Quick Setup",
          description: "Get started in minutes with our guided setup process",
          icon: "Zap"
        },
        {
          title: "Personalization",
          description: "Customize plans based on dietary preferences and budgets",
          icon: "Star"
        }
      ],
      mealPlanTypes: [
        {
          name: "Weekly Planner",
          description: "Plan meals for the entire week with your roommates",
          icon: "Calendar",
          features: ["7-day meal planning", "Shopping list generation", "Recipe suggestions", "Collaborative editing"]
        },
        {
          name: "Monthly Planner",
          description: "Long-term meal planning with budget tracking",
          icon: "Calendar",
          features: ["30-day meal planning", "Budget optimization", "Bulk shopping lists", "Nutrition tracking"]
        },
        {
          name: "Special Occasions",
          description: "Plan meals for parties, holidays, and special events",
          icon: "Star",
          features: ["Event planning", "Guest management", "Portion calculations", "Timeline management"]
        }
      ],
      pricingTiers: [
        {
          name: "Free",
          price: "$0",
          period: "forever",
          description: "Perfect for small groups getting started",
          features: [
            "Up to 3 roommates",
            "Basic meal planning",
            "Recipe library access",
            "Shopping list generation",
            "Email support"
          ],
          popular: false
        },
        {
          name: "Pro",
          price: "$9.99",
          period: "per month",
          description: "Ideal for active households",
          features: [
            "Up to 8 roommates",
            "Advanced meal planning",
            "Nutrition tracking",
            "Budget optimization",
            "Recipe sharing",
            "Priority support",
            "Custom meal categories"
          ],
          popular: true
        },
        {
          name: "Team",
          price: "$19.99",
          period: "per month",
          description: "For large households and communities",
          features: [
            "Unlimited roommates",
            "Advanced analytics",
            "Custom integrations",
            "White-label options",
            "Dedicated support",
            "API access",
            "Advanced reporting"
          ],
          popular: false
        }
      ],
      cta: {
        title: "Ready to Transform Your Meal Planning?",
        subtitle: "Join thousands of roommates who are already saving time and money with collaborative meal planning",
        ctaPrimary: {
          text: "Start Free Trial",
          href: "/register"
        },
        ctaSecondary: {
          text: "Schedule Demo",
          href: "/contact"
        }
      }
    }

    return NextResponse.json(mealPlansData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch meal plans data' },
      { status: 500 }
    )
  }
} 