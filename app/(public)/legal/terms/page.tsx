"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar } from "lucide-react"
import { motion } from "framer-motion"

export default function TermsOfServicePage() {
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

      {/* Terms Content */}
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
            </motion.div>

            {/* Service Description */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">2. Service Description</CardTitle>
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
            </motion.div>

            {/* User Accounts */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">3. User Accounts</CardTitle>
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
            </motion.div>

            {/* Acceptable Use */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">4. Acceptable Use</CardTitle>
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
            </motion.div>

            {/* Privacy and Data */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">5. Privacy and Data Protection</CardTitle>
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
            </motion.div>

            {/* Intellectual Property */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">6. Intellectual Property</CardTitle>
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
            </motion.div>

            {/* Payment Terms */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">7. Payment Terms</CardTitle>
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
            </motion.div>

            {/* Limitation of Liability */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">8. Limitation of Liability</CardTitle>
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
            </motion.div>

            {/* Termination */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">9. Termination</CardTitle>
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
            </motion.div>

            {/* Contact Information */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">10. Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <div className="space-y-2">
                    <p><strong>Email:</strong> legal@mealsphere.com</p>
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