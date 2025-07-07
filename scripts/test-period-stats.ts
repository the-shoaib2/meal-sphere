import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPeriodStats() {
  try {
    const roomId = '6852961df8c5bebb5b4c898a';
    const userId = '684d398784f925002d0c35e3';
    
    console.log('Testing period-based user stats...');
    
    // Get all periods for this room
    const allPeriods = await prisma.mealPeriod.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nFound ${allPeriods.length} periods:`);
    allPeriods.forEach(period => {
      console.log(`- ${period.name} (${period.status}) - ${period.startDate.toISOString().split('T')[0]} to ${period.endDate ? period.endDate.toISOString().split('T')[0] : 'ongoing'}`);
    });
    
    if (allPeriods.length === 0) {
      console.log('No periods found for this room');
      return;
    }
    
    // Test with the most recent period
    const testPeriod = allPeriods[0];
    console.log(`\nTesting with period: ${testPeriod.name}`);
    console.log(`Period dates: ${testPeriod.startDate.toISOString().split('T')[0]} to ${testPeriod.endDate ? testPeriod.endDate.toISOString().split('T')[0] : 'ongoing'}`);
    
    // Get meals for this period
    const mealsInPeriod = await prisma.meal.findMany({
      where: {
        roomId,
        userId,
        periodId: testPeriod.id
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\nMeals in period (${mealsInPeriod.length}):`);
    mealsInPeriod.forEach(meal => {
      console.log(`- ${meal.date.toISOString().split('T')[0]} ${meal.type}`);
    });
    
    // Get guest meals for this period
    const guestMealsInPeriod = await prisma.guestMeal.findMany({
      where: {
        roomId,
        userId,
        periodId: testPeriod.id
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\nGuest meals in period (${guestMealsInPeriod.length}):`);
    guestMealsInPeriod.forEach(meal => {
      console.log(`- ${meal.date.toISOString().split('T')[0]} ${meal.type} (${meal.count})`);
    });
    
    // Calculate expected daily stats
    const startDate = testPeriod.startDate;
    const endDate = testPeriod.endDate || new Date();
    
    console.log(`\nExpected daily range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Count days in the period
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    console.log(`Days in period: ${daysInPeriod}`);
    
    // Group meals by date
    const mealsByDate = new Map();
    mealsInPeriod.forEach(meal => {
      const dateStr = meal.date.toISOString().split('T')[0];
      if (!mealsByDate.has(dateStr)) {
        mealsByDate.set(dateStr, { breakfast: 0, lunch: 0, dinner: 0 });
      }
      mealsByDate.get(dateStr)[meal.type.toLowerCase()]++;
    });
    
    console.log(`\nMeals by date:`);
    mealsByDate.forEach((counts, date) => {
      console.log(`- ${date}: B:${counts.breakfast} L:${counts.lunch} D:${counts.dinner}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('Error testing period stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPeriodStats(); 