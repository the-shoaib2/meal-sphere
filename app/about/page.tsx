"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Users, Target, Award, Globe, Zap, Shield, Star } from "lucide-react"
import Image from "next/image"

export default function AboutPage() {
  const teamMembers = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-Founder",
      bio: "Former product manager at Google, passionate about solving real-world problems through technology.",
      image: "/placeholder.jpg",
      linkedin: "#"
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-Founder",
      bio: "Full-stack developer with 10+ years experience building scalable applications.",
      image: "/placeholder.jpg",
      linkedin: "#"
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Product",
      bio: "UX designer turned product manager, focused on creating intuitive user experiences.",
      image: "/placeholder.jpg",
      linkedin: "#"
    },
    {
      name: "David Kim",
      role: "Head of Engineering",
      bio: "Backend specialist with expertise in distributed systems and cloud architecture.",
      image: "/placeholder.jpg",
      linkedin: "#"
    }
  ]

  const values = [
    {
      icon: Heart,
      title: "Community First",
      description: "We believe in the power of community and building connections through shared experiences."
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Every feature is designed to bring people together and make collaboration seamless."
    },
    {
      icon: Target,
      title: "Simplicity",
      description: "Complex problems deserve simple solutions that anyone can use and understand."
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your data and privacy are our top priorities, always protected and never compromised."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "Constantly pushing boundaries to create better experiences for shared living."
    },
    {
      icon: Globe,
      title: "Inclusivity",
      description: "Building for everyone, regardless of background, dietary preferences, or living situation."
    }
  ]

  const stats = [
    { number: "50K+", label: "Active Users" },
    { number: "10K+", label: "Households" },
    { number: "1M+", label: "Meals Planned" },
    { number: "95%", label: "Satisfaction Rate" }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="secondary" className="mb-4">
              <Heart className="w-4 h-4 mr-2" />
              Our Story
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6">
              Building Better
              <span className="text-primary"> Communities</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
              MealSphere was born from a simple observation: shared living can be challenging, 
              but it doesn't have to be. We're on a mission to make roommates' lives easier, 
              one meal at a time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto">
                <Users className="w-5 h-5 mr-2" />
                Join Our Mission
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Globe className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-sm sm:text-base text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  In 2023, our founders were struggling with the same problem millions of roommates face: 
                  coordinating meals, splitting grocery bills, and managing shared expenses. What started 
                  as a simple spreadsheet quickly evolved into something bigger.
                </p>
                <p>
                  We realized that shared living doesn't have to be complicated. With the right tools, 
                  roommates can not only survive together but thrive together. That's why we built 
                  MealSphere - to transform the way people live together.
                </p>
                <p>
                  Today, we're proud to serve thousands of households across the globe, helping them 
                  build stronger relationships through better meal management.
                </p>
              </div>
            </div>
            <div className="relative order-1 lg:order-2">
              <div className="bg-primary/10 rounded-2xl p-6 sm:p-8 h-64 sm:h-80 flex items-center justify-center">
                <Users className="w-16 h-16 sm:w-32 sm:h-32 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To simplify shared living by providing intuitive tools that help roommates coordinate 
                  meals, manage expenses, and build stronger communities. We believe that when people 
                  can easily share resources and responsibilities, everyone benefits.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A world where shared living is not just a necessity but a choice people make because 
                  it's better than living alone. We envision communities where roommates become friends, 
                  neighbors become family, and shared resources create abundance for everyone.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {values.map((value) => (
              <Card key={value.title} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <value.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind MealSphere
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {teamMembers.map((member) => (
              <Card key={member.name} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{member.name}</h3>
                  <p className="text-primary text-sm mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm mb-4">{member.bio}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Join Us in Building Better Communities</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
            Whether you're a roommate, landlord, or just someone who believes in the power of community, 
            we'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto">
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
} 