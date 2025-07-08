"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import HeroSection from "@/components/home/hero-section"
import ShowcaseSection from "@/components/home/showcase-section"
import FeaturesSection from "@/components/home/features-section"

export default function Home() {

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
