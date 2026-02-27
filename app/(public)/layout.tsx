import type { Metadata } from "next"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { LoadingBar } from "@/components/shared/loading-bar"
import { FadeIn } from "@/components/ui/fade-in"

export const metadata: Metadata = {
  title: "MealSphere | Smart Meal Management for Shared Living",
  description: "Ditch the spreadsheets. MealSphere is the all-in-one platform for roommates to track meals, split costs fairly, and organize household shopping with ease.",
  keywords: ["meal management", "roommate expense tracker", "shared living", "meal planning", "hostel management", "shopping lists"],
  openGraph: {
    title: "MealSphere | Smart Meal Management for Shared Living",
    description: "The ultimate platform for roommates to sync meals and share costs without the headache.",
    url: "https://meal-sphere.vercel.app",
    siteName: "MealSphere",
    locale: "en_US",
    type: "website",
  },
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col w-full min-h-full">
      <LoadingBar />
      <PublicHeader />
      <main className="flex-1 w-full sm:pt-16">
        <FadeIn>
          {children}
        </FadeIn>
      </main>
      <PublicFooter />
    </div>
  )
}

