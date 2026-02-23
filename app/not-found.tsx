"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, ChefHat } from "lucide-react"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 overflow-hidden relative">

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            ease: [0, 0.71, 0.2, 1.01]
          }}
          className="relative"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
              <ChefHat className="w-24 h-24 text-destructive relative z-10" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/50 select-none">
            404
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold tracking-tight">
            Plate Empty?
          </h2>
          <p className="text-muted-foreground text-lg">
            The page you're looking for seems to have been eaten or does not exist.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4"
        >
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full sm:w-auto min-w-[140px] group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>

          <Button
            asChild
            className="w-full sm:w-auto min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Link>
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute bottom-8 left-0 right-0 text-center"
      >
        <p className="text-sm text-muted-foreground/50">
          Meal Sphere &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}