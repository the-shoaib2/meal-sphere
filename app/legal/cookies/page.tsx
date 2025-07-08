"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar, Cookie, Settings, Eye } from "lucide-react"

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <Cookie className="w-4 h-4 mr-2" />
              Cookie Policy
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Cookie
              <span className="text-blue-600"> Policy</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Learn how we use cookies and similar technologies to improve your experience 
              on MealSphere and provide personalized services.
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: January 15, 2025
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Policy Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cookie className="w-5 h-5 mr-2 text-blue-600" />
                  1. What Are Cookies?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  Cookies are small text files that are stored on your device when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences, 
                  analyzing how you use our site, and personalizing content.
                </p>
                <p>
                  We also use similar technologies such as web beacons, pixel tags, and local storage 
                  to enhance your experience on MealSphere.
                </p>
              </CardContent>
            </Card>

            {/* Types of Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>2. Types of Cookies We Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-gray-600">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Essential Cookies</h3>
                  <p>
                    These cookies are necessary for the website to function properly. They enable basic 
                    functions like page navigation, access to secure areas, and form submissions. 
                    The website cannot function properly without these cookies.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Authentication and security</li>
                    <li>Session management</li>
                    <li>Load balancing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Functional Cookies</h3>
                  <p>
                    These cookies enable enhanced functionality and personalization, such as remembering 
                    your preferences and settings.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Language preferences</li>
                    <li>Theme and display settings</li>
                    <li>User interface customization</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Analytics Cookies</h3>
                  <p>
                    These cookies help us understand how visitors interact with our website by collecting 
                    and reporting information anonymously.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Page views and navigation patterns</li>
                    <li>Feature usage statistics</li>
                    <li>Performance monitoring</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Marketing Cookies</h3>
                  <p>
                    These cookies are used to track visitors across websites to display relevant and 
                    engaging advertisements.
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Ad targeting and personalization</li>
                    <li>Campaign effectiveness measurement</li>
                    <li>Cross-site tracking</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Third-Party Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>3. Third-Party Cookies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  We may use third-party services that place cookies on your device. These services help us:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Google Analytics:</strong> Analyze website usage and performance</li>
                  <li><strong>Stripe:</strong> Process payments securely</li>
                  <li><strong>Intercom:</strong> Provide customer support and chat functionality</li>
                  <li><strong>Facebook Pixel:</strong> Track conversions and optimize advertising</li>
                </ul>
                <p>
                  These third-party services have their own privacy policies and cookie practices. 
                  We encourage you to review their policies for more information.
                </p>
              </CardContent>
            </Card>

            {/* Cookie Management */}
            <Card>
              <CardHeader>
                <CardTitle>4. Managing Your Cookie Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>You have several options for managing cookies:</p>
                
                <h3 className="font-semibold text-gray-900 mt-4">Browser Settings</h3>
                <p>
                  Most web browsers allow you to control cookies through their settings. You can:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Block all cookies</li>
                  <li>Allow only essential cookies</li>
                  <li>Delete existing cookies</li>
                  <li>Set preferences for specific websites</li>
                </ul>

                <h3 className="font-semibold text-gray-900 mt-4">Cookie Consent</h3>
                <p>
                  When you first visit our website, you'll see a cookie consent banner that allows you 
                  to choose which types of cookies to accept.
                </p>

                <h3 className="font-semibold text-gray-900 mt-4">Opt-Out Tools</h3>
                <p>
                  You can opt out of certain third-party cookies through industry opt-out tools:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Digital Advertising Alliance (DAA)</li>
                  <li>Network Advertising Initiative (NAI)</li>
                  <li>European Interactive Digital Advertising Alliance (EDAA)</li>
                </ul>
              </CardContent>
            </Card>

            {/* Cookie Duration */}
            <Card>
              <CardHeader>
                <CardTitle>5. Cookie Duration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>Cookies have different lifespans:</p>
                
                <h3 className="font-semibold text-gray-900 mt-4">Session Cookies</h3>
                <p>
                  These cookies are temporary and are deleted when you close your browser. They are used 
                  for session management and security.
                </p>

                <h3 className="font-semibold text-gray-900 mt-4">Persistent Cookies</h3>
                <p>
                  These cookies remain on your device for a set period or until you delete them. They are 
                  used for preferences, analytics, and marketing.
                </p>

                <h3 className="font-semibold text-gray-900 mt-4">Third-Party Cookies</h3>
                <p>
                  The duration of third-party cookies is determined by the respective service providers 
                  and may vary.
                </p>
              </CardContent>
            </Card>

            {/* Impact of Disabling Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>6. Impact of Disabling Cookies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  While you can disable cookies, doing so may affect your experience on our website:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Some features may not work properly</li>
                  <li>You may need to re-enter information repeatedly</li>
                  <li>Personalization features may be limited</li>
                  <li>Security features may be affected</li>
                </ul>
                <p>
                  Essential cookies are required for the website to function, so disabling all cookies 
                  may prevent you from using certain features.
                </p>
              </CardContent>
            </Card>

            {/* Updates to Policy */}
            <Card>
              <CardHeader>
                <CardTitle>7. Updates to This Cookie Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in our practices 
                  or for other operational, legal, or regulatory reasons.
                </p>
                <p>
                  We will notify you of any material changes by posting the updated policy on this page 
                  and updating the "Last updated" date.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>8. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  If you have any questions about our use of cookies or this Cookie Policy, please contact us:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> privacy@mealsphere.com</p>
                  <p><strong>Address:</strong> 123 Innovation Drive, San Francisco, CA 94105</p>
                  <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
} 