import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 600))

    const aboutData = {
      hero: {
        title: "Building Better Communities",
        subtitle: "MealSphere was born from a simple observation: shared living can be challenging, but it doesn't have to be. We're on a mission to make roommates' lives easier, one meal at a time.",
        ctaPrimary: {
          text: "Join Our Mission",
          href: "/register"
        },
        ctaSecondary: {
          text: "Learn More",
          href: "#story"
        }
      },
      stats: [
        { number: "50K+", label: "Active Users" },
        { number: "10K+", label: "Households" },
        { number: "1M+", label: "Meals Planned" },
        { number: "95%", label: "Satisfaction Rate" }
      ],
      story: {
        title: "Our Story",
        content: [
          "In 2023, our founders were struggling with the same problem millions of roommates face: coordinating meals, splitting grocery bills, and managing shared expenses. What started as a simple spreadsheet quickly evolved into something bigger.",
          "We realized that shared living doesn't have to be complicated. With the right tools, roommates can not only survive together but thrive together. That's why we built MealSphere - to transform the way people live together.",
          "Today, we're proud to serve thousands of households across the globe, helping them build stronger relationships through better meal management."
        ]
      },
      mission: {
        title: "Our Mission",
        description: "To simplify shared living by providing intuitive tools that help roommates coordinate meals, manage expenses, and build stronger communities. We believe that when people can easily share resources and responsibilities, everyone benefits."
      },
      vision: {
        title: "Our Vision",
        description: "A world where shared living is not just a necessity but a choice people make because it's better than living alone. We envision communities where roommates become friends, neighbors become family, and shared resources create abundance for everyone."
      },
      values: [
        {
          title: "Community First",
          description: "We believe in the power of community and building connections through shared experiences.",
          icon: "Heart"
        },
        {
          title: "Collaboration",
          description: "Every feature is designed to bring people together and make collaboration seamless.",
          icon: "Users"
        },
        {
          title: "Simplicity",
          description: "Complex problems deserve simple solutions that anyone can use and understand.",
          icon: "Target"
        },
        {
          title: "Trust & Security",
          description: "Your data and privacy are our top priorities, always protected and never compromised.",
          icon: "Shield"
        },
        {
          title: "Innovation",
          description: "Constantly pushing boundaries to create better experiences for shared living.",
          icon: "Zap"
        },
        {
          title: "Inclusivity",
          description: "Building for everyone, regardless of background, dietary preferences, or living situation.",
          icon: "Globe"
        }
      ],
      team: [
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
      ],
      cta: {
        title: "Join Us in Building Better Communities",
        subtitle: "Whether you're a roommate, landlord, or just someone who believes in the power of community, we'd love to hear from you.",
        ctaPrimary: {
          text: "Get Started",
          href: "/register"
        },
        ctaSecondary: {
          text: "Contact Us",
          href: "/contact"
        }
      }
    }

    return NextResponse.json(aboutData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch about data' },
      { status: 500 }
    )
  }
} 