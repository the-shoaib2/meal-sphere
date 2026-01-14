import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 300))

    const featuresData = {
      title: "Key Features",
      subtitle: "Everything you need to manage meals and costs in shared living spaces",
      features: [
        {
          id: 1,
          title: "Meal Tracking",
          description: "Track daily meals with ease. Mark your breakfast, lunch, and dinner with a simple click.",
          icon: "Utensils"
        },
        {
          id: 2,
          title: "Room Management",
          description: "Create rooms, add members, and elect managers through a democratic voting system.",
          icon: "Users"
        },
        {
          id: 3,
          title: "Payment Integration",
          description: "Integrated Bkash payment system for seamless meal cost settlements.",
          icon: "CreditCard"
        },
        {
          id: 4,
          title: "Notifications",
          description: "Get timely reminders for meal inputs, voting, and payment deadlines.",
          icon: "Bell"
        },
        {
          id: 5,
          title: "Cost Calculation",
          description: "Automatic calculation of meal rates, individual costs, and monthly summaries.",
          icon: "TrendingUp"
        },
        {
          id: 6,
          title: "Role-Based Access",
          description: "Different access levels for admins, managers, and members with customizable permissions.",
          icon: "Shield"
        }
      ]
    }

    return NextResponse.json(featuresData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch features data' },
      { status: 500 }
    )
  }
} 
