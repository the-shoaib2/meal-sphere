import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking for users...');
    
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, name: true, email: true, role: true }
    });
    
    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));
    
    return users;
  } catch (error) {
    console.error('Error checking users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers().catch(console.error);
