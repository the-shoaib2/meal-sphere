import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentPeriod() {
  try {
    const roomId = '6852961df8c5bebb5b4c898a';
    
    console.log('Checking current period details...');
    
    // Get current period
    const currentPeriod = await prisma.mealPeriod.findFirst({
      where: {
        roomId,
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (currentPeriod) {
      console.log('Current ACTIVE period:');
      console.log(`- Name: ${currentPeriod.name}`);
      console.log(`- Status: ${currentPeriod.status}`);
      console.log(`- Start Date: ${currentPeriod.startDate.toISOString().split('T')[0]}`);
      console.log(`- End Date: ${currentPeriod.endDate ? currentPeriod.endDate.toISOString().split('T')[0] : 'None'}`);
      console.log(`- ID: ${currentPeriod.id}`);
    } else {
      console.log('No ACTIVE period found');
    }
    
    // Get all periods
    const allPeriods = await prisma.mealPeriod.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nAll periods:');
    allPeriods.forEach(period => {
      console.log(`- ${period.name} (${period.status}) - ${period.startDate.toISOString().split('T')[0]} to ${period.endDate ? period.endDate.toISOString().split('T')[0] : 'ongoing'}`);
    });
    
    // Check if there's a period that covers July 1-31
    const julyPeriod = allPeriods.find(p => 
      p.startDate.getMonth() === 6 && p.startDate.getDate() === 1 && 
      p.startDate.getFullYear() === 2025
    );
    
    if (julyPeriod) {
      console.log('\nFound July period:');
      console.log(`- Name: ${julyPeriod.name}`);
      console.log(`- Status: ${julyPeriod.status}`);
      console.log(`- Start: ${julyPeriod.startDate.toISOString().split('T')[0]}`);
      console.log(`- End: ${julyPeriod.endDate ? julyPeriod.endDate.toISOString().split('T')[0] : 'None'}`);
    }
    
  } catch (error) {
    console.error('Error checking period:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentPeriod(); 