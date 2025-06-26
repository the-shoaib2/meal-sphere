"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="w-full min-h-[calc(100vh-50px)] flex items-center py-2 pt-0 md:py-4 lg:py-6 xl:py-8 px-4 sm:px-6 relative">
      <div className="absolute inset-0 z-0 bg-[url('/banner-v2.png')] bg-cover bg-center rounded-xl" />
      <div className="absolute inset-0 z-10 bg-secondary/30 dark:bg-black/60" />
      <div className="relative z-20 max-w-7xl mx-auto w-full">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Simplify Your Meal Management
              </h1>
              <p className="max-w-[600px]  md:text-xl dark:text-gray-400">
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
        </div>
      </div>
    </section>
  )
} 