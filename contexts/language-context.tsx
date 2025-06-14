"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type LanguageContextType = {
  language: string
  setLanguage: (language: string) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// English translations
const en = {
  // Common
  "app.name": "MealSphere",
  "app.tagline": "Meal Management System",

  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.meals": "Meals",
  "nav.shopping": "Shopping",
  "nav.payments": "Payments",
  "nav.calculations": "Calculations",
  "nav.voting": "Voting",
  "nav.excel": "Excel",
  "nav.notifications": "Notifications",
  "nav.settings": "Settings",
  "nav.logout": "Logout",

  // Auth
  "auth.login": "Login",
  "auth.register": "Register",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.name": "Name",
  "auth.forgotPassword": "Forgot Password?",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",

  // Dashboard
  "dashboard.welcome": "Welcome to MealSphere",
  "dashboard.overview": "Overview",
  "dashboard.mealCount": "Meal Count",
  "dashboard.totalExpense": "Total Expense",
  "dashboard.mealRate": "Meal Rate",
  "dashboard.dueAmount": "Due Amount",

  // Meals
  "meals.add": "Add Meal",
  "meals.date": "Date",
  "meals.type": "Type",
  "meals.breakfast": "Breakfast",
  "meals.lunch": "Lunch",
  "meals.dinner": "Dinner",
  "meals.custom": "Custom",
  "meals.guest": "Guest Meal",
  "meals.guestCount": "Number of Guests",

  // Shopping
  "shopping.add": "Add Shopping",
  "shopping.description": "Description",
  "shopping.amount": "Amount",
  "shopping.date": "Date",
  "shopping.receipt": "Receipt",
  "shopping.uploadReceipt": "Upload Receipt",

  // Payments
  "payments.add": "Add Payment",
  "payments.amount": "Amount",
  "payments.date": "Date",
  "payments.method": "Method",
  "payments.status": "Status",
  "payments.description": "Description",
  "payments.cash": "Cash",
  "payments.bkash": "bKash",
  "payments.other": "Other",

  // Calculations
  "calculations.title": "Meal Calculations",
  "calculations.period": "Period",
  "calculations.totalMeals": "Total Meals",
  "calculations.totalExpense": "Total Expense",
  "calculations.mealRate": "Meal Rate",
  "calculations.perPersonCost": "Per Person Cost",
  "calculations.dueAmount": "Due Amount",

  // Profile
  "profile.title": "Profile",
  "profile.appearance": "Appearance",
  "profile.language": "Language",
  "profile.security": "Security",
  "profile.save": "Save Changes",

  // Market Dates
  "market.title": "Market Dates",
  "market.assign": "Assign Market Date",
  "market.date": "Date",
  "market.member": "Member",
  "market.completed": "Completed",
  "market.fined": "Fined",
  "market.fineAmount": "Fine Amount",
  "market.enableFine": "Enable Fine",

  // Extra Expenses
  "expense.title": "Extra Expenses",
  "expense.add": "Add Expense",
  "expense.type": "Type",
  "expense.description": "Description",
  "expense.amount": "Amount",
  "expense.date": "Date",
  "expense.receipt": "Receipt",
  "expense.utility": "Utility",
  "expense.rent": "Rent",
  "expense.internet": "Internet",
  "expense.cleaning": "Cleaning",
  "expense.maintenance": "Maintenance",
  "expense.other": "Other",

  // Buttons
  "button.add": "Add",
  "button.edit": "Edit",
  "button.delete": "Delete",
  "button.save": "Save",
  "button.cancel": "Cancel",
  "button.submit": "Submit",
  "button.upload": "Upload",
  "button.download": "Download",
  "button.import": "Import",
  "button.export": "Export",

  // Notifications
  "notification.success": "Success",
  "notification.error": "Error",
  "notification.warning": "Warning",
  "notification.info": "Information",
}

// Bengali translations
const bn = {
  // Common
  "app.name": "মিলস্ফিয়ার",
  "app.tagline": "খাবার ব্যবস্থাপনা সিস্টেম",

  // Navigation
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.meals": "খাবার",
  "nav.shopping": "কেনাকাটা",
  "nav.payments": "পেমেন্ট",
  "nav.calculations": "হিসাব",
  "nav.voting": "ভোটিং",
  "nav.excel": "এক্সেল",
  "nav.profile": "প্রোফাইল",
  "nav.notifications": "নোটিফিকেশন",
  "nav.settings": "সেটিংস",
  "nav.logout": "লগআউট",

  // Auth
  "auth.login": "লগইন",
  "auth.register": "রেজিস্টার",
  "auth.email": "ইমেইল",
  "auth.password": "পাসওয়ার্ড",
  "auth.name": "নাম",
  "auth.forgotPassword": "পাসওয়ার্ড ভুলে গেছেন?",
  "auth.noAccount": "অ্যাকাউন্ট নেই?",
  "auth.haveAccount": "অ্যাকাউন্ট আছে?",

  // Dashboard
  "dashboard.welcome": "মিলস্ফিয়ারে স্বাগতম",
  "dashboard.overview": "ওভারভিউ",
  "dashboard.mealCount": "খাবার সংখ্যা",
  "dashboard.totalExpense": "মোট খরচ",
  "dashboard.mealRate": "খাবার রেট",
  "dashboard.dueAmount": "বাকি টাকা",

  // Meals
  "meals.add": "খাবার যোগ করুন",
  "meals.date": "তারিখ",
  "meals.type": "ধরন",
  "meals.breakfast": "সকালের নাস্তা",
  "meals.lunch": "দুপুরের খাবার",
  "meals.dinner": "রাতের খাবার",
  "meals.custom": "কাস্টম",
  "meals.guest": "অতিথি খাবার",
  "meals.guestCount": "অতিথি সংখ্যা",

  // Shopping
  "shopping.add": "কেনাকাটা যোগ করুন",
  "shopping.description": "বিবরণ",
  "shopping.amount": "পরিমাণ",
  "shopping.date": "তারিখ",
  "shopping.receipt": "রসিদ",
  "shopping.uploadReceipt": "রসিদ আপলোড করুন",

  // Payments
  "payments.add": "পেমেন্ট যোগ করুন",
  "payments.amount": "পরিমাণ",
  "payments.date": "তারিখ",
  "payments.method": "পদ্ধতি",
  "payments.status": "স্ট্যাটাস",
  "payments.description": "বিবরণ",
  "payments.cash": "নগদ",
  "payments.bkash": "বিকাশ",
  "payments.other": "অন্যান্য",

  // Calculations
  "calculations.title": "খাবার হিসাব",
  "calculations.period": "সময়কাল",
  "calculations.totalMeals": "মোট খাবার",
  "calculations.totalExpense": "মোট খরচ",
  "calculations.mealRate": "খাবার রেট",
  "calculations.perPersonCost": "প্রতি ব্যক্তি খরচ",
  "calculations.dueAmount": "বাকি টাকা",

  // Profile
  "profile.title": "প্রোফাইল",
  "profile.appearance": "অ্যাপিয়ারেন্স",
  "profile.language": "ভাষা",
  "profile.security": "সিকিউরিটি",
  "profile.save": "পরিবর্তন সংরক্ষণ করুন",

  // Market Dates
  "market.title": "বাজারের তারিখ",
  "market.assign": "বাজারের তারিখ নির্ধারণ করুন",
  "market.date": "তারিখ",
  "market.member": "সদস্য",
  "market.completed": "সম্পন্ন",
  "market.fined": "জরিমানা",
  "market.fineAmount": "জরিমানার পরিমাণ",
  "market.enableFine": "জরিমানা সক্রিয় করুন",

  // Extra Expenses
  "expense.title": "অতিরিক্ত খরচ",
  "expense.add": "খরচ যোগ করুন",
  "expense.type": "ধরন",
  "expense.description": "বিবরণ",
  "expense.amount": "পরিমাণ",
  "expense.date": "তারিখ",
  "expense.receipt": "রসিদ",
  "expense.utility": "ইউটিলিটি",
  "expense.rent": "ভাড়া",
  "expense.internet": "ইন্টারনেট",
  "expense.cleaning": "পরিষ্কার",
  "expense.maintenance": "রক্ষণাবেক্ষণ",
  "expense.other": "অন্যান্য",

  // Buttons
  "button.add": "যোগ করুন",
  "button.edit": "সম্পাদনা করুন",
  "button.delete": "মুছুন",
  "button.save": "সংরক্ষণ করুন",
  "button.cancel": "বাতিল করুন",
  "button.submit": "জমা দিন",
  "button.upload": "আপলোড করুন",
  "button.download": "ডাউনলোড করুন",
  "button.import": "ইম্পোর্ট করুন",
  "button.export": "এক্সপোর্ট করুন",

  // Notifications
  "notification.success": "সফল",
  "notification.error": "ত্রুটি",
  "notification.warning": "সতর্কতা",
  "notification.info": "তথ্য",
}

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
