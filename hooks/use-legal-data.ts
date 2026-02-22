import { useState, useEffect } from 'react'

interface LegalSection {
  id: number
  title: string
  icon?: string
  content: any[]
}

interface LegalData {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

export function useLegalData(type: 'terms' | 'privacy' | 'cookies') {
  const [data, setData] = useState<LegalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const { getLegalDataAction } = await import("@/lib/actions/public.actions")
        const result = await getLegalDataAction(type)
        if (result) {
          setData(result as any)
        }
      } catch (error) {
        console.error(`Error fetching ${type} data:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [type])

  return { data, isLoading }
} 