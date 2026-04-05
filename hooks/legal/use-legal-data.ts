import { useQuery } from '@tanstack/react-query';

export interface LegalSection {
  id: number;
  title: string;
  icon?: string;
  content: any[];
}

export interface LegalData {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

/**
 * Hook for fetching public legal data (Terms, Privacy, Cookies).
 */
export function useLegalData(type: 'terms' | 'privacy' | 'cookies') {
  return useQuery<LegalData, Error>({
    queryKey: ['legal-data', type],
    queryFn: async () => {
      const { getLegalDataAction } = await import("@/lib/actions/public.actions");
      const result = await getLegalDataAction(type);
      if (!result) throw new Error(`Failed to fetch ${type} data`);
      return result as unknown as LegalData;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - legal data rarely changes
  });
}
