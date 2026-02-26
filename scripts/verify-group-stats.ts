import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dumpDetailedRoomData(roomId: string) {
  console.log(`Detailed Data Dump for Room: ${roomId}`);

  const [meals, guestMeals, expenses, shopping, periods] = await Promise.all([
    prisma.meal.findMany({ where: { roomId } }),
    prisma.guestMeal.findMany({ where: { roomId } }),
    prisma.extraExpense.findMany({ where: { roomId } }),
    prisma.shoppingItem.findMany({ where: { roomId } }),
    prisma.mealPeriod.findMany({ where: { roomId } }),
  ]);

  console.log(`\nActive Periods: ${periods.filter(p => p.status === 'ACTIVE').map(p => `${p.name} (${p.id})`).join(', ')}`);

  console.log(`\n--- EXPENSES ---`);
  expenses.forEach(e => {
    console.log(`${e.date.toDateString()} | Amount: ${e.amount} | PeriodId: ${e.periodId} | Match: ${e.periodId === periods.find(p => p.status === 'ACTIVE')?.id ? 'YES' : 'NO'}`);
  });

  const targetDates = ['Wed Feb 25 2026', 'Thu Feb 26 2026', 'Fri Feb 27 2026'];
  const subsetMeals = meals.filter(m => targetDates.includes(m.date.toDateString()));
  const subsetGuestMeals = guestMeals.filter(m => targetDates.includes(m.date.toDateString()));
  
  const regCount = subsetMeals.length;
  const guestCount = subsetGuestMeals.reduce((sum, m) => sum + m.count, 0);
  
  console.log(`\n--- Subset (Feb 25, 26, 27) ---`);
  console.log(`Regular: ${regCount}, Guest: ${guestCount}, Total: ${regCount + guestCount}`);
  console.log(`Active Days in Subset: ${new Set([...subsetMeals.map(m => m.date.toDateString()), ...subsetGuestMeals.map(m => m.date.toDateString())]).size}`);
}

const roomId = 'ed6af3e0-c773-4c1c-ba3d-f2df82e6399a';
dumpDetailedRoomData(roomId)
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
