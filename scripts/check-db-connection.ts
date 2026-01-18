import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkConnection() {
  try {
    console.log('Checking database connection...');
    
    // Test the connection by running a simple query
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful!', result);
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();
