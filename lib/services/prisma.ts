import { PrismaClient } from "@prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Prisma client with optimized configuration
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: [], // Disable all logging
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Ensure single instance in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma