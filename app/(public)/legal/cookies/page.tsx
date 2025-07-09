"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar, Cookie } from "lucide-react"
import { motion } from "framer-motion"

export default function CookiesPolicyPage() {
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
    <div className="min-h-screen bg-background relative">
      {/* Backdrop blur background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 backdrop-blur-3xl -z-10" />
      
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <Badge variant="secondary" className="mb-4 animate-pulse">
              <Cookie className="w-4 h-4 mr-2" />
              Cookies
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              Cookie
              <span className="text-primary"> Policy</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              Learn how we use cookies and similar technologies to enhance your experience on MealSphere 
              and provide you with personalized content and services.
            </p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center justify-center text-sm text-muted-foreground"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: January 15, 2025
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Cookies Content */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 sm:space-y-8">
            {/* Introduction */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl group-hover:text-primary transition-colors">
                    <Shield className="w-5 h-5 mr-2 text-primary group-hover:scale-110 transition-transform" />
                    1. What Are Cookies?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit our website. 
                    They help us provide you with a better experience by remembering your preferences and analyzing how you use our platform.
                  </p>
                  <p>
                    Cookies can be set by us (first-party cookies) or by third-party services we use (third-party cookies).
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Types of Cookies */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">2. Types of Cookies We Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Essential Cookies</h4>
                      <p className="mb-2">These cookies are necessary for the website to function properly. They enable basic functions like:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>User authentication and login sessions</li>
                        <li>Security features and fraud prevention</li>
                        <li>Basic website functionality</li>
                        <li>Remembering your language preferences</li>
                      </ul>
                      <p className="mt-2 text-sm">These cookies cannot be disabled as they are essential for the website to work.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Analytics Cookies</h4>
                      <p className="mb-2">These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Pages visited and time spent on each page</li>
                        <li>Navigation patterns and user journeys</li>
                        <li>Performance and error monitoring</li>
                        <li>Feature usage and popularity</li>
                      </ul>
                      <p className="mt-2 text-sm">This information helps us improve our platform and user experience.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Preference Cookies</h4>
                      <p className="mb-2">These cookies remember your choices and preferences to provide a personalized experience:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Theme and appearance settings</li>
                        <li>Dietary preferences and restrictions</li>
                        <li>Meal planning preferences</li>
                        <li>Notification settings</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Marketing Cookies</h4>
                      <p className="mb-2">These cookies are used to deliver relevant advertisements and track marketing campaign performance:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Ad personalization and targeting</li>
                        <li>Campaign effectiveness measurement</li>
                        <li>Cross-site tracking for advertising</li>
                        <li>Social media integration</li>
                      </ul>
                      <p className="mt-2 text-sm">These cookies are only set with your explicit consent.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Third-Party Cookies */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">3. Third-Party Cookies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    We use third-party services that may set their own cookies on your device. These services help us provide better functionality and user experience.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Analytics Services</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Google Analytics - Website usage analytics</li>
                        <li>Mixpanel - User behavior tracking</li>
                        <li>Hotjar - User experience research</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Payment Processors</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Stripe - Payment processing</li>
                        <li>PayPal - Alternative payment method</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Social Media</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Facebook - Social sharing and login</li>
                        <li>Google - Authentication and sharing</li>
                        <li>Twitter - Social sharing</li>
                      </ul>
                    </div>
                  </div>
                  
                  <p>
                    Each third-party service has its own privacy policy and cookie practices. We recommend reviewing their policies for more information.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Cookie Management */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">4. Managing Your Cookie Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>You have several options for managing cookies:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Browser Settings</h4>
                      <p>Most web browsers allow you to control cookies through their settings. You can:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Block all cookies</li>
                        <li>Allow only first-party cookies</li>
                        <li>Delete existing cookies</li>
                        <li>Set preferences for specific websites</li>
                      </ul>
                      <p className="mt-2 text-sm">Note: Disabling certain cookies may affect website functionality.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Cookie Consent</h4>
                      <p>
                        When you first visit our website, you'll see a cookie consent banner that allows you to:
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Accept all cookies</li>
                        <li>Customize your preferences</li>
                        <li>Reject non-essential cookies</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Opt-Out Tools</h4>
                      <p>You can also use industry opt-out tools:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Digital Advertising Alliance (DAA) opt-out</li>
                        <li>Network Advertising Initiative (NAI) opt-out</li>
                        <li>European Interactive Digital Advertising Alliance (EDAA) opt-out</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">5. Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                  </p>
                  <div className="space-y-2">
                    <p><strong>Email:</strong> privacy@mealsphere.com</p>
                    <p><strong>Address:</strong> 123 Innovation Drive, San Francisco, CA 94105</p>
                    <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                  </div>
                  <p>
                    We will respond to your inquiry within 30 days of receipt.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  )
} 