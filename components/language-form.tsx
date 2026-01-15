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
import { toast } from "react-hot-toast"
import { useLanguage } from "@/contexts/language-context"

const languageFormSchema = z.object({
  language: z.enum(["en", "bn"], {
    required_error: "Please select a language.",
  }),
})

type LanguageFormValues = z.infer<typeof languageFormSchema>

interface LanguageFormProps {
  user: User
}

export function LanguageForm({ user }: LanguageFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const [previewLanguage, setPreviewLanguage] = useState<string | null>(null)
  const [revertTimeout, setRevertTimeout] = useState<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState<number>(0)

  const form = useForm<LanguageFormValues>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      language: (user.language as "en" | "bn") || language,
    },
  })

  // Handle language preview with auto-save after countdown
  const handleLanguagePreview = async (lang: string) => {
    // Clear any existing timeout
    if (revertTimeout) {
      clearTimeout(revertTimeout)
    }
    
    // Set the preview language
    setPreviewLanguage(lang)
    setLanguage(lang as "en" | "bn")
    
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
    
    // Set a timeout to save after 5 seconds
    const timeout = setTimeout(async () => {
      clearInterval(countdownInterval)
      
      try {
        // Update form value to match the preview
        form.setValue('language', lang as any)
        
        // Save the language
        const response = await fetch("/api/user/language", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ language: lang }),
        })

        if (!response.ok) {
          throw new Error("Failed to update language")
        }

        // Clear preview state
        setPreviewLanguage(null)
        setCountdown(0)
        
        // Show success message
        toast.success(t("notification.success"))
        router.refresh()
      } catch (error) {
        console.error(error)
        // Revert on error
        setLanguage(user.language as "en" | "bn" || language)
        toast.error(t("notification.error"))
      }
    }, 5000)
    
    setRevertTimeout(timeout as unknown as NodeJS.Timeout)
    
    // Cleanup interval on unmount or when timeout is cleared
    return () => clearInterval(countdownInterval)
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (revertTimeout) {
        clearTimeout(revertTimeout)
      }
    }
  }, [revertTimeout])

  async function onSubmit(data: LanguageFormValues) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/language", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update language")
      }

      setLanguage(data.language)
      setPreviewLanguage(null)
      setCountdown(0)
      toast.success(t("notification.success"))
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(t("notification.error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.language")}</CardTitle>
        <CardDescription>
          {t("profile.language")} {t("profile.save")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.language")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        handleLanguagePreview(value)
                      }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="en" id="en" className="peer sr-only" />
                        <Label
                          htmlFor="en"
                          className="flex flex-col  items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors duration-200 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span className="text-2xl mb-2">🇺🇸</span>
                          English
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="bn" id="bn" className="peer sr-only" />
                        <Label
                          htmlFor="bn"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors duration-200 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span className="text-2xl mb-2">🇧🇩</span>
                          বাংলা
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>{t("profile.language")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("notification.saving") : t("profile.save")}
              </Button>
              {previewLanguage && countdown > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t("notification.previewing_changes")} {countdown}s
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
