"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Calendar, Users, ShoppingCart, ChefHat, Clock, Star, Zap } from "lucide-react"
import { motion } from "framer-motion"

export default function MealPlansPage() {
  const mealPlanTypes = [
    {
      name: "Weekly Planner",
      description: "Plan meals for the entire week with your roommates",
      icon: Calendar,
      features: ["7-day meal planning", "Shopping list generation", "Recipe suggestions", "Collaborative editing"]
    },
    {
      name: "Monthly Planner",
      description: "Long-term meal planning with budget tracking",
      icon: Calendar,
      features: ["30-day meal planning", "Budget optimization", "Bulk shopping lists", "Nutrition tracking"]
    },
    {
      name: "Special Occasions",
      description: "Plan meals for parties, holidays, and special events",
      icon: Star,
      features: ["Event planning", "Guest management", "Portion calculations", "Timeline management"]
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
            className="mb-8"
          >
            <Badge variant="secondary" className="mb-4 animate-pulse">
              <Calendar className="w-4 h-4 mr-2" />
              Meal Planning
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              Plan Meals Together
              <span className="text-primary"> Smarter</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              Coordinate meals with your roommates, save money on groceries, and never wonder what's for dinner again. 
              Our collaborative meal planning makes shared living delicious and efficient.
            </p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
            >
              <Button size="lg" className="w-full sm:w-auto group">
                <Calendar className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Planning
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto group">
                <Users className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Invite Roommates
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features */}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Why Choose MealSphere?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to plan meals collaboratively with your roommates
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5">
                <CardContent className="pt-6">
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Meal Plan Types */}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Meal Plan Types</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the planning style that works best for your household
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {mealPlanTypes.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5">
                <CardHeader>
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <plan.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">{plan.name}</CardTitle>
                  <CardDescription className="text-sm sm:text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Pricing */}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your household size and needs
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className={`relative hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 ${tier.popular ? 'ring-2 ring-primary' : ''}`}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                    <CardTitle className="text-xl sm:text-2xl group-hover:text-primary transition-colors">{tier.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-3xl sm:text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/{tier.period}</span>
                  </div>
                  <CardDescription className="text-sm sm:text-base">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                      className={`w-full group ${tier.popular ? '' : 'bg-muted-foreground hover:bg-muted-foreground/90'}`}
                  >
                      <span className="group-hover:scale-105 transition-transform">
                    {tier.name === 'Free' ? 'Get Started' : 'Choose Plan'}
                      </span>
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
            Ready to Transform Your Meal Planning?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90"
          >
            Join thousands of roommates who are already saving time and money with collaborative meal planning
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
          >
            <Button size="lg" variant="secondary" className="w-full sm:w-auto group">
              <span className="group-hover:scale-105 transition-transform">Start Free Trial</span>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto group">
              <span className="group-hover:scale-105 transition-transform">Schedule Demo</span>
            </Button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
} 