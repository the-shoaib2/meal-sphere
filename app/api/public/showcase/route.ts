import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 400))

    const showcaseData = {
      title: "See MealSphere in Action",
      subtitle: "Experience a seamless interface on both desktop and mobile. Designed for clarity, speed, and ease of use.",
      screenshots: {
        desktop: {
          image: "/Screenshot-desktop.png",
          alt: "Desktop view screenshot",
          label: "Desktop View"
        },
        mobile: {
          image: "/Screenshot-phone.png",
          alt: "Phone view screenshot",
          label: "Phone View"
        }
      }
    }

    return NextResponse.json(showcaseData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch showcase data' },
      { status: 500 }
    )
  }
} 
