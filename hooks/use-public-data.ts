import { useState, useEffect, useCallback } from 'react'

interface UsePublicDataOptions<T> {
  endpoint: string
  enabled?: boolean
  initialData?: T | null
}

interface UsePublicDataReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePublicData<T>({ endpoint, enabled = true, initialData = null }: UsePublicDataOptions<T>): UsePublicDataReturn<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (isInitial = false) => {
    if (!enabled) return
    if (isInitial && initialData) return

    setLoading(true)
    setError(null)

    try {
      const { getPublicDataAction } = await import("@/lib/actions/public.actions")
      const result = await getPublicDataAction(endpoint)
      
      if (!result) {
        throw new Error(`Failed to fetch data: ${endpoint}`)
      }

      setData(result as T)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [endpoint, enabled, initialData])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}
 