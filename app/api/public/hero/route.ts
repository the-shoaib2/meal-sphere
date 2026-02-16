import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 500))

    const heroData = {
      title: "Simplify Your Meal Management",
      subtitle: "Track meals, calculate costs, and manage payments with ease. Perfect for roommates, hostels, and shared living spaces.",
      ctaPrimary: {
        text: "Get Started",
        href: "/register"
      },
      ctaSecondary: {
        text: "Learn More",
        href: "/about"
      },
      backgroundImage: "/banner.jpg"
    }

    return NextResponse.json(heroData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch hero data' },
      { status: 500 }
    )
  }
} 
