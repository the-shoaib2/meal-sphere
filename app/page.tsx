"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Utensils, Users, CreditCard, Bell } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import HeroSection from "@/components/home/hero-section"
import ShowcaseSection from "@/components/home/showcase-section"
import FeaturesSection from "@/components/home/features-section"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicHeader />
      <main className="flex-1 w-full overflow-y-auto">
        <HeroSection />
        <FeaturesSection />
        <ShowcaseSection />
        <PublicFooter />
      </main>
    </div>
  )
}
