"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, Calendar, Lock, Eye, Users, Database } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <Shield className="w-4 h-4 mr-2" />
              Privacy Policy
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Your Privacy
              <span className="text-blue-600"> Matters</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              We are committed to protecting your privacy and being transparent about how we collect, 
              use, and protect your personal information.
            </p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: January 15, 2025
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-blue-600" />
                  1. Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  MealSphere ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                  explains how we collect, use, disclose, and safeguard your information when you use our meal 
                  planning and shared living management platform.
                </p>
                <p>
                  By using our Service, you consent to the data practices described in this policy. If you do not 
                  agree with our policies and practices, please do not use our Service.
                </p>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card>
              <CardHeader>
                <CardTitle>2. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                <p>We may collect the following personal information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Name and contact information (email, phone number)</li>
                  <li>Account credentials and profile information</li>
                  <li>Payment and billing information</li>
                  <li>Communication preferences</li>
                </ul>

                <h3 className="font-semibold text-gray-900 mt-6">Usage Information</h3>
                <p>We automatically collect certain information about your use of the Service:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Device information and IP address</li>
                  <li>Usage patterns and preferences</li>
                  <li>Cookies and similar tracking technologies</li>
                  <li>Log files and analytics data</li>
                </ul>

                <h3 className="font-semibold text-gray-900 mt-6">Content You Provide</h3>
                <p>We collect content you create or share through the Service:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Meal plans and recipes</li>
                  <li>Expense records and payment information</li>
                  <li>Messages and communications</li>
                  <li>Feedback and reviews</li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card>
              <CardHeader>
                <CardTitle>3. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, maintain, and improve our Service</li>
                  <li>Process transactions and manage your account</li>
                  <li>Communicate with you about your account and our Service</li>
                  <li>Send you marketing communications (with your consent)</li>
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Detect and prevent fraud and abuse</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </CardContent>
            </Card>

            {/* Information Sharing */}
            <Card>
              <CardHeader>
                <CardTitle>4. Information Sharing and Disclosure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
                
                <h3 className="font-semibold text-gray-900 mt-4">With Your Consent</h3>
                <p>We may share your information with third parties when you give us explicit consent to do so.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Service Providers</h3>
                <p>We may share information with trusted third-party service providers who assist us in operating our Service, such as:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Payment processors</li>
                  <li>Cloud hosting providers</li>
                  <li>Analytics services</li>
                  <li>Customer support platforms</li>
                </ul>

                <h3 className="font-semibold text-gray-900 mt-4">Legal Requirements</h3>
                <p>We may disclose your information if required by law or in response to valid legal requests.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Business Transfers</h3>
                <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.</p>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card>
              <CardHeader>
                <CardTitle>5. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal 
                  information against unauthorized access, alteration, disclosure, or destruction.
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
                  However, no method of transmission over the internet or electronic storage is 100% secure. 
                  While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle>6. Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  We retain your personal information for as long as necessary to provide our Service and fulfill 
                  the purposes outlined in this Privacy Policy.
                </p>
                <p>We may retain certain information for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Account management and customer support</li>
                  <li>Legal compliance and record keeping</li>
                  <li>Analytics and service improvement</li>
                  <li>Fraud prevention and security</li>
                </ul>
                <p>
                  When you delete your account, we will delete or anonymize your personal information, except 
                  where retention is required by law or for legitimate business purposes.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardHeader>
                <CardTitle>7. Your Rights and Choices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>You have the following rights regarding your personal information:</p>
                
                <h3 className="font-semibold text-gray-900 mt-4">Access and Portability</h3>
                <p>You can request access to your personal information and receive a copy of your data.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Correction</h3>
                <p>You can request correction of inaccurate or incomplete personal information.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Deletion</h3>
                <p>You can request deletion of your personal information, subject to certain exceptions.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Objection</h3>
                <p>You can object to certain processing of your personal information.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Marketing Communications</h3>
                <p>You can opt out of marketing communications at any time by following the unsubscribe instructions.</p>

                <h3 className="font-semibold text-gray-900 mt-4">Cookies</h3>
                <p>You can control cookie settings through your browser preferences.</p>
              </CardContent>
            </Card>

            {/* International Transfers */}
            <Card>
              <CardHeader>
                <CardTitle>8. International Data Transfers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  Your information may be transferred to and processed in countries other than your own. 
                  We ensure that such transfers comply with applicable data protection laws.
                </p>
                <p>
                  For users in the European Economic Area (EEA), we implement appropriate safeguards, 
                  such as standard contractual clauses, to protect your data when transferred outside the EEA.
                </p>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>9. Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  Our Service is not intended for children under 13 years of age. We do not knowingly collect 
                  personal information from children under 13.
                </p>
                <p>
                  If you are a parent or guardian and believe your child has provided us with personal information, 
                  please contact us immediately. We will take steps to remove such information from our records.
                </p>
              </CardContent>
            </Card>

            {/* Changes to Policy */}
            <Card>
              <CardHeader>
                <CardTitle>10. Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any material changes 
                  by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
                <p>
                  We encourage you to review this Privacy Policy periodically for any changes. Your continued 
                  use of the Service after any changes constitutes acceptance of the updated policy.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>11. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-600">
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> privacy@mealsphere.com</p>
                  <p><strong>Address:</strong> 123 Innovation Drive, San Francisco, CA 94105</p>
                  <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                  <p><strong>Data Protection Officer:</strong> dpo@mealsphere.com</p>
                </div>
                <p>
                  For users in the European Union, you also have the right to lodge a complaint with your 
                  local data protection authority.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
} 