"use client"

import { useLegalData } from "@/hooks/use-legal-data"
import { LegalContentRenderer } from "@/components/shared/legal-content-renderer"

export default function CookiesPolicyPage() {
  const { data, isLoading } = useLegalData('cookies')

  return <LegalContentRenderer data={data} type="cookies" isLoading={isLoading} />
} 