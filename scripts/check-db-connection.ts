import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkConnection() {
  try {
    console.log('Checking database connection...');
    
    // Test the connection by running a simple query
    const result = await prisma.$runCommandRaw({ ping: 1 });
    console.log('Database connection successful!', result);
    
    // Check if notifications collection exists
    const collections = await prisma.$runCommandRaw({ listCollections: 1 });
    console.log('Collections:', collections);
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();
