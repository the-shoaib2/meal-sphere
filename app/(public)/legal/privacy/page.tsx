"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar, Lock } from "lucide-react"
import { motion } from "framer-motion"

export default function PrivacyPolicyPage() {
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
              <Lock className="w-4 h-4 mr-2" />
              Privacy
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              Privacy
              <span className="text-primary"> Policy</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              We respect your privacy and are committed to protecting your personal information. 
              This policy explains how we collect, use, and safeguard your data.
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

      {/* Privacy Content */}
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
                    MealSphere ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                    explains how we collect, use, disclose, and safeguard your information when you use our meal 
                    planning and shared living management platform.
                  </p>
                  <p>
                    By using our service, you consent to the data practices described in this policy.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Information We Collect */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">2. Information We Collect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>We collect several types of information from and about users of our platform:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Personal Information</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Name and email address</li>
                        <li>Profile information and preferences</li>
                        <li>Payment information (processed securely by third parties)</li>
                        <li>Communication preferences</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Usage Information</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Meal plans and recipes you create or save</li>
                        <li>Shopping lists and expense tracking data</li>
                        <li>Group membership and collaboration activities</li>
                        <li>App usage patterns and preferences</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Technical Information</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Device information and IP addresses</li>
                        <li>Browser type and version</li>
                        <li>Operating system</li>
                        <li>Usage analytics and performance data</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* How We Use Information */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">3. How We Use Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Provide and maintain our meal planning services</li>
                    <li>Process payments and manage subscriptions</li>
                    <li>Enable collaboration between roommates and group members</li>
                    <li>Personalize your experience and provide relevant content</li>
                    <li>Send important updates and notifications</li>
                    <li>Improve our platform and develop new features</li>
                    <li>Ensure security and prevent fraud</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Information Sharing */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">4. Information Sharing and Disclosure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">With Your Consent</h4>
                      <p>We may share information when you explicitly consent to such sharing.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Group Collaboration</h4>
                      <p>Information you share within groups (meal plans, expenses, etc.) is visible to other group members.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Service Providers</h4>
                      <p>We may share information with trusted third-party service providers who assist us in operating our platform.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Legal Requirements</h4>
                      <p>We may disclose information if required by law or to protect our rights and safety.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Security */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">5. Data Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                  </p>
                  <p>Our security measures include:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Encryption of data in transit and at rest</li>
                    <li>Regular security assessments and updates</li>
                    <li>Access controls and authentication</li>
                    <li>Secure data centers and infrastructure</li>
                    <li>Employee training on data protection</li>
                  </ul>
                  <p>
                    However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Retention */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">6. Data Retention</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy.
                  </p>
                  <p>
                    When you delete your account, we will delete or anonymize your personal information, except where we need to retain certain information for legal, regulatory, or legitimate business purposes.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Your Rights */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">7. Your Rights and Choices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>You have the following rights regarding your personal information:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Access:</strong> Request a copy of your personal information</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                    <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                    <li><strong>Objection:</strong> Object to certain processing activities</li>
                    <li><strong>Restriction:</strong> Request limitation of processing</li>
                  </ul>
                  <p>
                    To exercise these rights, please contact us using the information provided at the end of this policy.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Information */}
            <motion.div variants={cardVariants} whileHover="hover" className="group">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">8. Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
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