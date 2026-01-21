import { prisma } from "@/lib/services/prisma";
import { unstable_cache } from "next/cache";
import { cacheGet, cacheSet } from '@/lib/cache/cache-service';

export const getMarketDates = async (roomId: string) => {
  return await prisma.marketDate.findMany({
    where: {
      roomId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};

export const fetchMarketDates = async (roomId: string) => {
  // Use unstable_cache for caching
  return unstable_cache(
    async () => {
      return await getMarketDates(roomId);
    },
    [`market-dates-${roomId}`], // Cache key
    {
      revalidate: 60, // Revalidate every minute
      tags: [`market-dates-${roomId}`], // Tag for invalidation
    }
  )();
};
