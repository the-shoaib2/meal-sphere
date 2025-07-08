"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MapPin, Clock, MessageCircle, HelpCircle, Send, Users } from "lucide-react"

export default function ContactPage() {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email within 24 hours",
      contact: "support@mealsphere.com"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak with our team directly",
      contact: "+1 (555) 123-4567"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with us in real-time",
      contact: "Available 9AM-6PM EST"
    }
  ]

  const faqs = [
    {
      question: "How do I invite my roommates to join?",
      answer: "Simply create a group and share the invite link with your roommates. They can join using the link or by searching for your group name."
    },
    {
      question: "Can I use MealSphere for free?",
      answer: "Yes! We offer a free plan that supports up to 3 roommates with basic meal planning features. Upgrade to Pro for more features."
    },
    {
      question: "How do you handle payments and expenses?",
      answer: "Our expense tracking feature helps you split bills, track payments, and manage shared expenses transparently with your roommates."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use industry-standard encryption and security practices to protect your personal information and data."
    },
    {
      question: "Can I export my meal plans and data?",
      answer: "Yes, you can export your meal plans, shopping lists, and expense reports in various formats for your convenience."
    },
    {
      question: "Do you support dietary restrictions?",
      answer: "Yes! You can set dietary preferences and restrictions for each roommate, and our recipe suggestions will respect these preferences."
    }
  ]

  const officeLocations = [
    {
      city: "San Francisco",
      address: "123 Innovation Drive, San Francisco, CA 94105",
      phone: "+1 (555) 123-4567",
      hours: "Mon-Fri 9AM-6PM PST"
    },
    {
      city: "New York",
      address: "456 Tech Avenue, New York, NY 10001",
      phone: "+1 (555) 987-6543",
      hours: "Mon-Fri 9AM-6PM EST"
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <MessageCircle className="w-4 h-4 mr-2" />
              Get in Touch
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              We'd Love to
              <span className="text-primary"> Hear from You</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              Have questions, feedback, or need help? Our team is here to support you. 
              Reach out and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {contactMethods.map((method) => (
              <Card key={method.title} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <method.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{method.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-3">{method.description}</p>
                  <p className="text-primary font-medium">{method.contact}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Form */}
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">Send us a Message</h2>
              <form className="space-y-4 sm:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
                    <Input placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
                    <Input placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input type="email" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                  <Input placeholder="How can we help you?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Message</label>
                  <Textarea 
                    placeholder="Tell us more about your question or feedback..."
                    rows={6}
                  />
                </div>
                <Button className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">Office Locations</h2>
              <div className="space-y-4 sm:space-y-6">
                {officeLocations.map((office) => (
                  <Card key={office.city}>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg sm:text-xl">
                        <MapPin className="w-5 h-5 mr-2 text-primary" />
                        {office.city}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground">{office.address}</p>
                      <p className="text-muted-foreground flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {office.phone}
                      </p>
                      <p className="text-muted-foreground flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {office.hours}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Find answers to common questions about MealSphere
            </p>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <HelpCircle className="w-5 h-5 mr-2 text-primary" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support Channels */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">Need More Help?</h2>
          <p className="text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            We're here to help you get the most out of MealSphere. Choose the support option that works best for you.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Live Chat</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Get instant help from our support team</p>
                <Button variant="outline" className="w-full">Start Chat</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Community Forum</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Connect with other MealSphere users</p>
                <Button variant="outline" className="w-full">Join Forum</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer sm:col-span-2 lg:col-span-1">
              <CardContent className="pt-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Help Center</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Browse our comprehensive documentation</p>
                <Button variant="outline" className="w-full">Visit Help Center</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
            Join thousands of roommates who are already using MealSphere to simplify their shared living experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
} 