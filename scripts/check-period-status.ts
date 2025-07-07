#!/usr/bin/env tsx

import { prisma } from '../lib/prisma';

async function checkPeriodStatus() {
  console.log('🔍 Checking period status...');
  
  try {
    const allPeriods = await prisma.mealPeriod.findMany({
      include: {
        room: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        roomId: 'asc',
        status: 'asc',
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total periods: ${allPeriods.length}`);
    console.log('');

    // Group by roomId and status
    const groupedPeriods = new Map<string, any[]>();
    
    allPeriods.forEach(period => {
      const key = `${period.roomId}_${period.status}`;
      if (!groupedPeriods.has(key)) {
        groupedPeriods.set(key, []);
      }
      groupedPeriods.get(key)!.push(period);
    });

    // Check for violations
    const violations = Array.from(groupedPeriods.entries())
      .filter(([key, periods]) => periods.length > 1);

    if (violations.length === 0) {
      console.log('✅ No violations found! Database is ready for the unique constraint.');
      console.log('');
      console.log('💡 You can now run: npx prisma db push');
      return;
    }

    console.log(`⚠️  Found ${violations.length} violations:`);
    console.log('');

    for (const [key, periods] of violations) {
      const [roomId, status] = key.split('_');
      const room = periods[0].room;
      
      console.log(`📋 Group: ${room.name} (${roomId})`);
      console.log(`   Status: ${status}`);
      console.log(`   Duplicate periods: ${periods.length}`);
      
      periods.forEach((period, index) => {
        console.log(`     ${index + 1}. ${period.name} (${period.id}) - Created: ${period.createdAt.toLocaleDateString()}`);
      });
      console.log('');
    }

    console.log('🔧 Run: npm run fix-period-violations');
    
  } catch (error) {
    console.error('❌ Error checking period status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPeriodStatus().catch(console.error); 