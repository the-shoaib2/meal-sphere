"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import en from "@/translations/en.json"
import bn from "@/translations/bn.json"

type LanguageContextType = {
  language: string
  setLanguage: (language: string) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  en,
  bn,
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState("en")

  useEffect(() => {
    // Get language from localStorage or use browser language
    const savedLanguage = localStorage.getItem("language")
    if (savedLanguage) {
      setLanguage(savedLanguage)
    } else {
      const browserLang = navigator.language.split("-")[0]
      setLanguage(browserLang === "bn" ? "bn" : "en")
    }
  }, [])

  const changeLanguage = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: string) => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.en
    return currentTranslations[key as keyof typeof en] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
