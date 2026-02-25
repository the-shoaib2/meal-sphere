import HeroSection from "@/components/home/hero-section"
import ShowcaseSection from "@/components/home/showcase-section"
import FeaturesSection from "@/components/home/features-section"
import { RecipesSection } from "@/components/home/recipes-section"
import { MealPlansSection } from "@/components/home/meal-plans-section"
import { AboutSection } from "@/components/home/about-section"
import { ContactSection } from "@/components/home/contact-section"
import { getPublicDataAction } from "@/lib/actions/public.actions"

export default async function Home() {
  // Fetch all public data in parallel for "Ultra-Fast" SSR
  const [
    featuresData,
    showcaseData,
    recipesData,
    mealPlansData,
    aboutData,
    contactData
  ] = await Promise.all([
    getPublicDataAction("features"),
    getPublicDataAction("showcase"),
    getPublicDataAction("recipes"),
    getPublicDataAction("meal-plans"),
    getPublicDataAction("about"),
    getPublicDataAction("contact")
  ])

  return (
    <>
      <HeroSection />
      <div id="features">
        <FeaturesSection initialData={featuresData as any} />
      </div>
      <ShowcaseSection initialData={showcaseData as any} />
      <RecipesSection initialData={recipesData as any} />
      <MealPlansSection initialData={mealPlansData as any} />
      <AboutSection initialData={aboutData as any} />
      <ContactSection initialData={contactData as any} />
    </>
  )
}
