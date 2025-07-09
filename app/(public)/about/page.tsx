"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Users, Target, Award, Globe, Zap, Shield, Star } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

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
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <Badge variant="secondary" className="mb-4 animate-pulse">
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
            >
              <Button size="lg" className="w-full sm:w-auto group">
                <Users className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Join Our Mission
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto group">
                <Globe className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                variants={itemVariants}
                className="text-center"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-sm sm:text-base text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Our Story */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div variants={itemVariants} className="order-2 lg:order-1">
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
            </motion.div>
            <motion.div 
              variants={itemVariants}
              className="relative order-1 lg:order-2"
            >
              <div className="bg-primary/10 rounded-2xl p-6 sm:p-8 h-64 sm:h-80 flex items-center justify-center backdrop-blur-sm">
                <Users className="w-16 h-16 sm:w-32 sm:h-32 text-primary" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Mission & Vision */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <motion.div variants={cardVariants} whileHover="hover">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl group-hover:text-primary transition-colors">Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    To simplify shared living by providing intuitive tools that help roommates coordinate 
                    meals, manage expenses, and build stronger communities. We believe that when people 
                    can easily share resources and responsibilities, everyone benefits.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={cardVariants} whileHover="hover">
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl group-hover:text-primary transition-colors">Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A world where shared living is not just a necessity but a choice people make because 
                    it's better than living alone. We envision communities where roommates become friends, 
                    neighbors become family, and shared resources create abundance for everyone.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Values */}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <value.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{value.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Team */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-muted/30 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={itemVariants}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind MealSphere
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                variants={cardVariants}
                whileHover="hover"
                className="group"
              >
                <Card className="text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 group-hover:bg-primary/5 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <motion.div 
                      className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Users className="w-8 h-8 sm:w-12 sm:h-12 text-primary group-hover:scale-110 transition-transform" />
                    </motion.div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{member.name}</h3>
                    <p className="text-primary text-sm mb-3">{member.role}</p>
                    <p className="text-muted-foreground text-sm mb-4">{member.bio}</p>
                    <Button variant="outline" size="sm" className="w-full group">
                      <span className="group-hover:scale-105 transition-transform">Connect</span>
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
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-primary backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl sm:text-3xl font-bold mb-4"
          >
            Join Us in Building Better Communities
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90"
          >
            Whether you're a roommate, landlord, or just someone who believes in the power of community, 
            we'd love to hear from you.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
          >
            <Button size="lg" variant="secondary" className="w-full sm:w-auto group">
              <span className="group-hover:scale-105 transition-transform">Get Started</span>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary w-full sm:w-auto group">
              <span className="group-hover:scale-105 transition-transform">Contact Us</span>
            </Button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
} 