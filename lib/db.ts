import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client;
}

export const db = client;

export async function connectDB() {
  try {
    await client.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await client.$disconnect();
  console.log('Database disconnected');
}

export default client;
