"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar, Cookie } from "lucide-react"

export default function CookiesPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
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
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: January 15, 2025
            </div>
          </div>
        </div>
      </section>

      {/* Cookies Content */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 sm:space-y-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
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

            {/* Types of Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">2. Types of Cookies We Use</CardTitle>
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

            {/* Third-Party Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">3. Third-Party Cookies</CardTitle>
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

            {/* Cookie Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">4. Managing Your Cookie Preferences</CardTitle>
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

            {/* Cookie Duration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">5. How Long Cookies Last</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Session Cookies</h4>
                    <p>These cookies are temporary and are deleted when you close your browser. They are used for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Maintaining your login session</li>
                      <li>Shopping cart contents</li>
                      <li>Temporary form data</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Persistent Cookies</h4>
                    <p>These cookies remain on your device for a set period or until you delete them. They are used for:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Remembering your preferences</li>
                      <li>Analytics and tracking</li>
                      <li>Personalization settings</li>
                      <li>Marketing and advertising</li>
                    </ul>
                  </div>
                </div>
                
                <p>
                  Most of our persistent cookies expire within 1-2 years, but some may last longer depending on their purpose.
                </p>
              </CardContent>
            </Card>

            {/* Updates to Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">6. Updates to This Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
                </p>
                <p>
                  When we make changes, we will update the "Last updated" date at the top of this policy and notify you through our website or email if the changes are significant.
                </p>
                <p>
                  We encourage you to review this policy periodically to stay informed about how we use cookies.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">7. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium">MealSphere Privacy Team</p>
                  <p>Email: privacy@mealsphere.com</p>
                  <p>Address: 123 Innovation Drive, San Francisco, CA 94105</p>
                  <p>Phone: +1 (555) 123-4567</p>
                </div>
                <p>
                  For questions about third-party cookies, please refer to the respective privacy policies of those services.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
} 