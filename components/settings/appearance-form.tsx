"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { User } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
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
  const { theme: currentTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "system",
    },
  })

  // Sync form value with current theme when mounted or theme changes
  useEffect(() => {
    if (mounted && currentTheme) {
      form.setValue('theme', currentTheme as "light" | "dark" | "system")
    }
  }, [mounted, currentTheme, form])

  const handleThemeChange = (theme: string) => {
    setTheme(theme)
    form.setValue('theme', theme as any)
  }

  if (!mounted) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Appearance</CardTitle>
        <CardDescription className="text-sm">Choose your preferred theme</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-3 gap-3"
                  >
                    <div>
                      <RadioGroupItem value="light" id="light" className="peer sr-only" />
                      <Label
                        htmlFor="light"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Sun className="mb-2 h-5 w-5" />
                        <span className="text-sm">Light</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                      <Label
                        htmlFor="dark"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Moon className="mb-2 h-5 w-5" />
                        <span className="text-sm">Dark</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="system" id="system" className="peer sr-only" />
                      <Label
                        htmlFor="system"
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Laptop className="mb-2 h-5 w-5" />
                        <span className="text-sm">System</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        </Form>
      </CardContent>
    </Card>
  )
}
