"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Utensils, Users, CreditCard, Bell } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicHeader />
      <main className="flex-1 w-full overflow-y-auto">
        <section className="w-full py-2 pt-0 md:py-4 lg:py-6 xl:py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Simplify Your Meal Management
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                    Track meals, calculate costs, and manage payments with ease. Perfect for roommates, hostels, and
                    shared living spaces.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/register">
                    <Button size="lg" className="gap-1.5 rounded-full">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/about">
                    <Button size="lg" variant="outline" className="rounded-full">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center w-full">
                <div className="relative w-full h-[600px] overflow-hidden rounded-xl">
                  <img
                    src="/placeholder.svg"
                    alt="MealSphere Dashboard Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-8 md:py-12 lg:py-16 bg-gray-100 dark:bg-gray-800 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Key Features</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Everything you need to manage meals and costs in shared living spaces
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <Utensils className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Meal Tracking</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Track daily meals with ease. Mark your breakfast, lunch, and dinner with a simple click.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Room Management</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Create rooms, add members, and elect managers through a democratic voting system.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Payment Integration</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Integrated Bkash payment system for seamless meal cost settlements.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Notifications</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Get timely reminders for meal inputs, voting, and payment deadlines.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-primary"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Cost Calculation</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Automatic calculation of meal rates, individual costs, and monthly summaries.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="rounded-full bg-primary/10 p-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-primary"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold">Role-Based Access</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Different access levels for admins, managers, and members with customizable permissions.
                </p>
              </div>
            </div>
          </div>
        </section>
        <PublicFooter />
      </main>
    </div>
  )
}
