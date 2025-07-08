"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Calendar, Users, ShoppingCart, ChefHat, Clock, Star, Zap } from "lucide-react"

export default function MealPlansPage() {
  const mealPlanTypes = [
    {
      name: "Weekly Planner",
      description: "Plan meals for the entire week with your roommates",
      icon: Calendar,
      features: ["7-day meal planning", "Shopping list generation", "Recipe suggestions", "Collaborative editing"],
      color: "bg-blue-100 text-blue-700"
    },
    {
      name: "Monthly Planner",
      description: "Long-term meal planning with budget tracking",
      icon: Calendar,
      features: ["30-day meal planning", "Budget optimization", "Bulk shopping lists", "Nutrition tracking"],
      color: "bg-green-100 text-green-700"
    },
    {
      name: "Special Occasions",
      description: "Plan meals for parties, holidays, and special events",
      icon: Star,
      features: ["Event planning", "Guest management", "Portion calculations", "Timeline management"],
      color: "bg-purple-100 text-purple-700"
    }
  ]

  const pricingTiers = [
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
  ]

  const features = [
    {
      icon: Users,
      title: "Collaborative Planning",
      description: "Plan meals together with your roommates in real-time"
    },
    {
      icon: ShoppingCart,
      title: "Smart Shopping Lists",
      description: "Automatically generate shopping lists from your meal plans"
    },
    {
      icon: ChefHat,
      title: "Recipe Integration",
      description: "Access thousands of recipes and add them to your plans"
    },
    {
      icon: Clock,
      title: "Time Management",
      description: "Plan cooking times and coordinate kitchen schedules"
    },
    {
      icon: Zap,
      title: "Quick Setup",
      description: "Get started in minutes with our guided setup process"
    },
    {
      icon: Star,
      title: "Personalization",
      description: "Customize plans based on dietary preferences and budgets"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <Calendar className="w-4 h-4 mr-2" />
              Meal Planning
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Plan Meals Together
              <span className="text-green-600"> Smarter</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Coordinate meals with your roommates, save money on groceries, and never wonder what's for dinner again. 
              Our collaborative meal planning makes shared living delicious and efficient.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Calendar className="w-5 h-5 mr-2" />
                Start Planning
              </Button>
              <Button variant="outline" size="lg">
                <Users className="w-5 h-5 mr-2" />
                Invite Roommates
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose MealSphere?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to plan meals collaboratively with your roommates
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <feature.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Meal Plan Types */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meal Plan Types</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the planning style that works best for your household
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {mealPlanTypes.map((plan) => (
              <Card key={plan.name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-16 h-16 mb-4 rounded-full ${plan.color} flex items-center justify-center`}>
                    <plan.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your household size and needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className={`relative ${tier.popular ? 'ring-2 ring-green-500' : ''}`}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-gray-500">/{tier.period}</span>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${tier.popular ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                  >
                    {tier.name === 'Free' ? 'Get Started' : 'Choose Plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Meal Planning?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of roommates who are already saving time and money with collaborative meal planning
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-green-600">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
} 