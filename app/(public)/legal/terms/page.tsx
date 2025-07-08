"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar } from "lucide-react"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <FileText className="w-4 h-4 mr-2" />
              Legal
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              Terms of
              <span className="text-primary"> Service</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              Please read these terms carefully before using MealSphere. By using our service, 
              you agree to be bound by these terms.
            </p>
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: January 15, 2025
            </div>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6 sm:space-y-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
                  1. Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Welcome to MealSphere ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of our 
                  meal planning and shared living management platform, including our website, mobile applications, and 
                  related services (collectively, the "Service").
                </p>
                <p>
                  By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part 
                  of these terms, then you may not access the Service.
                </p>
              </CardContent>
            </Card>

            {/* Service Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">2. Service Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  MealSphere provides a platform for roommates and shared living communities to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Plan and coordinate meals together</li>
                  <li>Manage shared expenses and payments</li>
                  <li>Track grocery shopping and meal preparation</li>
                  <li>Access recipes and meal suggestions</li>
                  <li>Communicate and collaborate on household management</li>
                </ul>
                <p>
                  We reserve the right to modify, suspend, or discontinue any part of the Service at any time with 
                  reasonable notice.
                </p>
              </CardContent>
            </Card>

            {/* User Accounts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">3. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  To use certain features of the Service, you must create an account. You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Providing accurate and complete information</li>
                  <li>Maintaining the security of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                </ul>
                <p>
                  You must be at least 18 years old to create an account. If you are under 18, you may only use the 
                  Service with the involvement of a parent or guardian.
                </p>
              </CardContent>
            </Card>

            {/* Acceptable Use */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">4. Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on the rights of others</li>
                  <li>Upload or share harmful, offensive, or inappropriate content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with the proper functioning of the Service</li>
                  <li>Use the Service for commercial purposes without permission</li>
                </ul>
              </CardContent>
            </Card>

            {/* Privacy and Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">5. Privacy and Data Protection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Your privacy is important to us. Our collection and use of personal information is governed by our 
                  Privacy Policy, which is incorporated into these Terms by reference.
                </p>
                <p>
                  By using the Service, you consent to the collection and use of your information as described in our 
                  Privacy Policy.
                </p>
                <p>
                  We implement appropriate security measures to protect your data, but no method of transmission over 
                  the internet is 100% secure.
                </p>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">6. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The Service and its original content, features, and functionality are owned by MealSphere and are 
                  protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p>
                  You retain ownership of any content you submit to the Service, but you grant us a worldwide, 
                  non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content in 
                  connection with the Service.
                </p>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">7. Payment Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Some features of the Service may require payment. All payments are processed securely through 
                  third-party payment processors.
                </p>
                <p>
                  Subscription fees are billed in advance on a recurring basis. You may cancel your subscription 
                  at any time, but no refunds will be provided for partial billing periods.
                </p>
                <p>
                  We reserve the right to change our pricing with 30 days' notice to existing customers.
                </p>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">8. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  To the maximum extent permitted by law, MealSphere shall not be liable for any indirect, incidental, 
                  special, consequential, or punitive damages, including without limitation, loss of profits, data, 
                  use, goodwill, or other intangible losses.
                </p>
                <p>
                  Our total liability to you for any claims arising from these Terms or your use of the Service shall 
                  not exceed the amount you paid us in the 12 months preceding the claim.
                </p>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">9. Termination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  You may terminate your account at any time by contacting us or using the account deletion feature 
                  in your settings.
                </p>
                <p>
                  We may terminate or suspend your account immediately, without prior notice, for conduct that we 
                  believe violates these Terms or is harmful to other users, us, or third parties.
                </p>
                <p>
                  Upon termination, your right to use the Service will cease immediately, and we may delete your 
                  account and data.
                </p>
              </CardContent>
            </Card>

            {/* Changes to Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">10. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of any material changes 
                  by posting the new Terms on this page and updating the "Last updated" date.
                </p>
                <p>
                  Your continued use of the Service after any changes constitutes acceptance of the new Terms.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">11. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium">MealSphere Support</p>
                  <p>Email: legal@mealsphere.com</p>
                  <p>Address: 123 Innovation Drive, San Francisco, CA 94105</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
} 