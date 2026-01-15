"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"
import { toast } from "react-hot-toast"
import { Moon, Sun, Laptop } from "lucide-react"

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

interface AppearanceFormProps {
  user: User
}

export function AppearanceForm({ user }: AppearanceFormProps) {
  const router = useRouter()
  const { theme: currentTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)
  const [revertTimeout, setRevertTimeout] = useState<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState<number>(0)

  // Ensure component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: ((mounted && currentTheme) as "light" | "dark" | "system") || "system",
    },
  })

  // Handle theme preview with auto-revert after countdown
  const handleThemePreview = (theme: string) => {
    // Clear any existing timeout
    if (revertTimeout) {
      clearTimeout(revertTimeout)
    }

    // Store current theme for potential revert
    const originalTheme = currentTheme || 'system'

    // Set the preview theme
    setPreviewTheme(theme)
    setTheme(theme)

    // Start countdown from 5
    let count = 5
    setCountdown(count)

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      count--
      setCountdown(count)

      if (count <= 0) {
        clearInterval(countdownInterval)
      }
    }, 1000)

    // Set a timeout to revert after 5 seconds if not saved
    const timeout = setTimeout(() => {
      clearInterval(countdownInterval)

      // Revert to original theme
      setTheme(originalTheme)
      form.setValue('theme', originalTheme as any)

      // Clear preview state
      setPreviewTheme(null)
      setCountdown(0)

      // Show message that changes were reverted
      toast("Theme reverted to previous setting")

    }, 5000)

    setRevertTimeout(timeout as unknown as NodeJS.Timeout)

    // Cleanup interval on unmount or when timeout is cleared
    return () => clearInterval(countdownInterval)
  }

  // Handle form submission
  const onSubmit = (data: AppearanceFormValues) => {
    // Clear any pending timeout
    if (revertTimeout) {
      clearTimeout(revertTimeout)
      setRevertTimeout(null)
    }

    // Save the theme permanently
    setTheme(data.theme)
    setPreviewTheme(null)
    setCountdown(0)
    toast.success("Appearance updated successfully")
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (revertTimeout) {
        clearTimeout(revertTimeout)
      }
    }
  }, [revertTimeout])

  if (!mounted) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the appearance of the application. Choose between light, dark, and system themes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        handleThemePreview(value)
                      }}
                      className="grid grid-cols-3 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="light" id="light" className="peer sr-only" />
                        <Label
                          htmlFor="light"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Sun className="mb-3 h-6 w-6" />
                          Light
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                        <Label
                          htmlFor="dark"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Moon className="mb-3 h-6 w-6" />
                          Dark
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="system" id="system" className="peer sr-only" />
                        <Label
                          htmlFor="system"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Laptop className="mb-3 h-6 w-6" />
                          System
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>Select the theme for the application.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                className="hover:cursor-pointer transition-colors duration-200"
              >
                Save Changes
              </Button>
              {previewTheme && countdown > 0 && (
                <div className="text-sm text-muted-foreground">
                  Previewing changes... {countdown}s
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
